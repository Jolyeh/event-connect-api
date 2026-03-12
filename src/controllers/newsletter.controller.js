
import { z } from "zod";
import { sendResponse } from "../utils/response.js";
import { prisma } from "../config/prisma.js"

const subscribeSchema = z.object({
  email: z.string().email("Email invalide"),
});

// POST /api/newsletter/subscribe
export async function subscribe(req, res) {
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    const error = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0]
      || parsed.error.errors[0]?.message;
    return sendResponse(res, false, error);
  }

  const { email } = parsed.data;

  try {
    // Vérifier si déjà inscrit
    const existing = await prisma.newsletter.findUnique({ where: { email } });
    if (existing) {
      return sendResponse(res, true, "Vous êtes déjà inscrit à la newsletter.");
    }

    const subscription = await prisma.newsletter.create({
      data: { email },
    });

    return sendResponse(res, true, "Inscription réussie.");
  } catch (error) {
    console.error("[NEWSLETTER_SUBSCRIBE]", error);
    return sendResponse(res, false, "Erreur serveur.");
  }
}

// DELETE /api/newsletter/unsubscribe
export async function unsubscribe(req, res) {
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    const error = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0]
      || parsed.error.errors[0]?.message;
    return sendResponse(res, false, error);
  }

  const { email } = parsed.data;

  try {
    const existing = await prisma.newsletter.findUnique({ where: { email } });
    if (!existing) {
      return sendResponse(res, false, "Cet email n'est pas inscrit à la newsletter.");
    }

    await prisma.newsletter.delete({ where: { email } });

    return sendResponse(res, true, "Désinscription réussie.");
  } catch (error) {
    console.error("[NEWSLETTER_UNSUBSCRIBE]", error);
    return sendResponse(res, false, "Erreur serveur.");
  }
}

// GET /api/newsletter — admin : liste tous les abonnés
export async function getAllSubscribers(req, res) {
  try {
    const subscribers = await prisma.newsletter.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, createdAt: true },
    });

    return sendResponse(res, true, "Les abonnées", subscribers);;
  } catch (error) {
    console.error("[NEWSLETTER_GET_ALL]", error);
    return sendResponse(res, false, "Erreur serveur.");
  }
}
