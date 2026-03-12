import { prisma } from "../config/prisma.js";
import { sendResponse } from "../utils/response.js";
import { createBookingSchema } from "../validations/booking.validation.js";
import { nanoid } from "nanoid";
import { FedaPay, Transaction, Webhook } from "fedapay";
import { appUrl } from "../utils/constant.js";
import { addClient, notifyClient } from "../utils/sse.js";
import { verifyFedapaySignature } from "../utils/fedapay.js";

FedaPay.setApiKey(process.env.FEDAPAY_SECRET_KEY);
FedaPay.setEnvironment(process.env.FEDAPAY_ENV);

function generateReference() {
  return `EVB-${nanoid(8).toUpperCase()}`;
}

function generateTicketCode() {
  return `TKT-${nanoid(10).toUpperCase()}`;
}

const bookingSelect = {
  id: true,
  reference: true,
  userName: true,
  userEmail: true,
  userPhone: true,
  status: true,
  totalAmount: true,
  paidAt: true,
  createdAt: true,
  event: {
    select: { id: true, title: true, dateStart: true, coverImage: true, venue: true, city: true, isOnline: true },
  },
  items: {
    select: {
      id: true,
      quantity: true,
      price: true,
      ticket: { select: { id: true, name: true, description: true } },
    },
  },
};

// ── POST /api/bookings ───────────────────────────────────────────────────────
export async function createBooking(req, res) {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    const error = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return sendResponse(res, false, error);
  }

  const { eventId, userName, userEmail, userPhone, items } = parsed.data;

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, status: true, title: true, isFree: true },
    });
    if (!event) return sendResponse(res, false, "Événement introuvable.");
    if (event.status !== "PUBLISHED") return sendResponse(res, false, "Cet événement n'accepte plus de réservations.");

    if (!event.isFree && (!items || items.length === 0)) {
      return sendResponse(res, false, "Sélectionnez au moins un billet.");
    }

    let totalAmount = 0;
    let itemsData = [];

    if (items && items.length > 0) {
      const tickets = await prisma.ticket.findMany({
        where: { id: { in: items.map(i => i.ticketId) }, eventId },
      });
      if (tickets.length !== items.length) {
        return sendResponse(res, false, "Un ou plusieurs billets sont invalides.");
      }

      for (const item of items) {
        const ticket = tickets.find(t => t.id === item.ticketId);
        const available = ticket.quantity - ticket.sold;
        if (item.quantity > available) {
          return sendResponse(res, false, `Stock insuffisant pour "${ticket.name}" (${available} disponible${available > 1 ? "s" : ""}).`);
        }
        totalAmount += ticket.price * item.quantity;
        itemsData.push({ ticketId: ticket.id, quantity: item.quantity, price: ticket.price });
      }
    }

    const reference = generateReference();
    const booking = await prisma.booking.create({
      data: {
        reference,
        userName,
        userEmail,
        userPhone,
        totalAmount,
        status: "PENDING",
        eventId,
        ...(itemsData.length > 0 && { items: { create: itemsData } }),
      },
      select: bookingSelect,
    });

    // Événement gratuit → confirmer directement
    if (event.isFree || totalAmount === 0) {
      await confirmFreeBooking(booking);
      return res.status(201).json({
        status: true,
        message: "Inscription confirmée.",
        data: { booking: { ...booking, status: "CONFIRMED" }, paymentUrl: null },
      });
    }

    // Événement payant → FedaPay
    const transaction = await Transaction.create({
      description: `Billets — ${event.title}`,
      amount: Math.round(totalAmount),
      currency: { iso: "XOF" },
      callback_url: `${appUrl}/event/booking/confirmation?ref=${reference}&bookingId=${booking.id}`,
      customer: {
        firstname: userName.split(" ")[0] ?? userName,
        lastname: userName.split(" ").slice(1).join(" ") || "-",
        email: userEmail,
        phone_number: { number: userPhone, country: "BJ" },
      },
      metadata: { bookingId: booking.id, reference },
    });

    const token = await transaction.generateToken();
    const paymentUrl = token.url;

    await prisma.booking.update({
      where: { id: booking.id },
      data: { fedapayId: String(transaction.id) },
    });

    return res.status(201).json({
      status: true,
      message: "Réservation créée. Redirigez l'utilisateur vers le lien de paiement.",
      data: { booking, paymentUrl, fedapayId: transaction.id },
    });

  } catch (error) {
    console.error("[BOOKING_CREATE]", error);
    return sendResponse(res, false, "Erreur lors de la création de la réservation.");
  }
}

// ── GET /api/bookings/status/:bookingId — SSE ────────────────────────────────
export async function bookingStatusSSE(req, res) {
  const { bookingId } = req.params;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, reference: true },
    });

    if (!booking) {
      return res.status(404).json({ status: false, message: "Réservation introuvable." });
    }

    // Déjà confirmée → répondre immédiatement sans garder la connexion ouverte
    if (booking.status === "CONFIRMED") {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      res.write(`data: ${JSON.stringify({ status: "CONFIRMED", reference: booking.reference })}\n\n`);
      res.end();
      return;
    }

    // Sinon on enregistre le client et on attend le webhook
    addClient(bookingId, res);

  } catch (error) {
    console.error("[BOOKING_SSE]", error);
    return res.status(500).json({ status: false, message: "Erreur serveur." });
  }
}

// ── Confirmer une réservation gratuite ───────────────────────────────────────
async function confirmFreeBooking(booking) {
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED", paidAt: new Date() },
    });

    for (const item of booking.items ?? []) {
      if (item.ticket?.id) {
        await tx.ticket.update({
          where: { id: item.ticket.id },
          data: { sold: { increment: item.quantity } },
        });
      }
    }

    const ticketCodes = [];
    for (const item of booking.items ?? []) {
      for (let i = 0; i < item.quantity; i++) {
        ticketCodes.push({ code: generateTicketCode(), bookingId: booking.id, ticketId: item.ticket.id });
      }
    }
    if (ticketCodes.length > 0) {
      await tx.issuedTicket.createMany({ data: ticketCodes });
    }
  });

  const issuedTickets = await prisma.issuedTicket.findMany({
    where: { bookingId: booking.id },
    select: { code: true, ticket: { select: { name: true } } },
  });

  await sendBookingConfirmationEmail({ booking, issuedTickets });
}

// ── POST /api/bookings/webhook/fedapay ──────────────────────────────────────
export async function fedapayWebhook(req, res) {
  const sig = req.headers["x-fedapay-signature"];
  const secret = process.env.FEDAPAY_WEBHOOK_SECRET;

  if (!verifyFedapaySignature(req.rawBody, sig, secret)) {
    console.warn("[WEBHOOK] Signature invalide — ignoré.");
    return res.status(200).json({ received: true });
  }

  const event = req.body;

  if (event.name !== "transaction.approved") {
    return res.status(200).json({ received: true });
  }

  try {
    const tx = event.entity;
    const fedapayId = String(tx.id);
    const amount = tx.amount;
    const method = tx.payment_method?.type ?? "UNKNOWN";

    const booking = await prisma.booking.findFirst({
      where: { fedapayId },
      select: {
        id: true, status: true, userEmail: true, userName: true,
        userPhone: true, totalAmount: true, reference: true,
        event: { select: { id: true, title: true, dateStart: true, venue: true, city: true, isOnline: true } },
        items: { select: { quantity: true, price: true, ticket: { select: { id: true, name: true } } } },
      },
    });

    if (!booking) return res.status(200).json({ received: true });
    if (booking.status === "CONFIRMED") return res.status(200).json({ received: true });

    const existingTx = await prisma.transaction.findUnique({ where: { transactionId: fedapayId } });
    if (existingTx) return res.status(200).json({ received: true });

    await prisma.$transaction(async (prismaTx) => {
      await prismaTx.booking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED", paidAt: new Date() },
      });
      await prismaTx.transaction.create({
        data: { bookingId: booking.id, amount, method, status: "approved", transactionId: fedapayId },
      });
      for (const item of booking.items) {
        await prismaTx.ticket.update({
          where: { id: item.ticket.id },
          data: { sold: { increment: item.quantity } },
        });
      }
      const ticketCodes = [];
      for (const item of booking.items) {
        for (let i = 0; i < item.quantity; i++) {
          ticketCodes.push({ code: generateTicketCode(), bookingId: booking.id, ticketId: item.ticket.id });
        }
      }
      if (ticketCodes.length > 0) {
        await prismaTx.issuedTicket.createMany({ data: ticketCodes });
      }
    });

    const issuedTickets = await prisma.issuedTicket.findMany({
      where: { bookingId: booking.id },
      select: { code: true, ticket: { select: { name: true } } },
    });

    await sendBookingConfirmationEmail({ booking, issuedTickets });
    notifyClient(booking.id, { status: "CONFIRMED", reference: booking.reference });

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[FEDAPAY_WEBHOOK]", error);
    return res.status(500).json({ error: "Erreur serveur." });
  }
}

// ── GET /api/bookings/verify/:reference ─────────────────────────────────────
export async function verifyBooking(req, res) {
  const { reference } = req.params;
  try {
    const booking = await prisma.booking.findUnique({ where: { reference }, select: bookingSelect });
    if (!booking) return sendResponse(res, false, "Réservation introuvable.");
    return sendResponse(res, true, "Réservation trouvée.", booking);
  } catch (error) {
    console.error("[BOOKING_VERIFY]", error);
    return sendResponse(res, false, "Erreur serveur.");
  }
}

// ── GET /api/bookings/my ─────────────────────────────────────────────────────
export async function getMyBookings(req, res) {
  const email = req.user?.email ?? req.query.email;
  if (!email) return sendResponse(res, false, "Email requis.");
  try {
    const bookings = await prisma.booking.findMany({
      where: { userEmail: email }, orderBy: { createdAt: "desc" }, select: bookingSelect,
    });
    return sendResponse(res, true, "Réservations récupérées.", bookings);
  } catch (error) {
    console.error("[BOOKING_MY]", error);
    return sendResponse(res, false, "Erreur serveur.");
  }
}

// ── PATCH /api/bookings/:id/cancel ───────────────────────────────────────────
export async function cancelBooking(req, res) {
  const { id } = req.params;
  const userEmail = req.user?.email ?? req.body.email;
  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, status: true, userEmail: true, items: { select: { ticketId: true, quantity: true } } },
    });
    if (!booking) return sendResponse(res, false, "Réservation introuvable.");
    if (booking.userEmail !== userEmail) return sendResponse(res, false, "Accès refusé.");
    if (booking.status === "CANCELLED") return sendResponse(res, false, "Cette réservation est déjà annulée.");
    if (booking.status === "CONFIRMED") return sendResponse(res, false, "Une réservation confirmée ne peut pas être annulée ici.");

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id }, data: { status: "CANCELLED" } });
      for (const item of booking.items) {
        await tx.ticket.update({ where: { id: item.ticketId }, data: { sold: { decrement: item.quantity } } });
      }
    });

    return sendResponse(res, true, "Réservation annulée.");
  } catch (error) {
    console.error("[BOOKING_CANCEL]", error);
    return sendResponse(res, false, "Erreur serveur.");
  }
}

// ── Helper email ─────────────────────────────────────────────────────────────
async function sendBookingConfirmationEmail({ booking, issuedTickets }) {
  console.log(`[EMAIL] Envoi billets à ${booking.userEmail}`, issuedTickets.map(t => t.code));
}