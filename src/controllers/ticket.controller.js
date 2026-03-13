// controllers/ticket.controller.js

import { prisma } from "../config/prisma.js";
import { sendResponse } from "../utils/response.js";

// ── Select réutilisable ───────────────────────────────────────────────────
const ticketSelect = {
  id: true,
  code: true,
  usedAt: true,
  ticket: { select: { id: true, name: true } },
  booking: {
    select: {
      id: true,
      reference: true,
      userName: true,
      userEmail: true,
      status: true,
      event: {
        select: {
          id: true,
          title: true,
          dateStart: true,
          venue: true,
          city: true,
          isOnline: true,
        },
      },
    },
  },
};

// ── GET /api/tickets/verify/:code ─────────────────────────────────────────
export async function verifyTicket(req, res) {
  const { code } = req.params;

  try {
    const ticket = await prisma.issuedTicket.findUnique({
      where: { code },
      select: ticketSelect,
    });

    if (!ticket)
      return sendResponse(res, false, "Billet introuvable.");

    if (ticket.booking.status !== "CONFIRMED")
      return sendResponse(res, false, "La réservation n'est pas confirmée.");

    return sendResponse(res, true, "Billet trouvé.", ticket);
  } catch (err) {
    console.error("[VERIFY_TICKET]", err);
    return sendResponse(res, false, "Erreur serveur.");
  }
}

// ── POST /api/tickets/use/:code ───────────────────────────────────────────
export async function useTicket(req, res) {
  const { code } = req.params;

  try {
    const ticket = await prisma.issuedTicket.findUnique({
      where: { code },
      select: ticketSelect,
    });

    if (!ticket)
      return sendResponse(res, false, "Billet introuvable.");

    if (ticket.booking.status !== "CONFIRMED")
      return sendResponse(res, false, "La réservation n'est pas confirmée.");

    if (ticket.usedAt)
      return sendResponse(res, false, "Ce billet a déjà été utilisé.", ticket);

    const updated = await prisma.issuedTicket.update({
      where: { code },
      data: { usedAt: new Date() },
      select: ticketSelect,
    });
    
    return sendResponse(res, true, "Billet validé avec succès.", updated);
  } catch (err) {
    console.error("[USE_TICKET]", err);
    return sendResponse(res, false, "Erreur serveur.");
  }
}
