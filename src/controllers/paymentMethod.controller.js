import { createPaymentMethodSchema } from "../validations/paymentMethod.js";
import { sendResponse } from "../utils/response.js";
import { prisma } from "../config/prisma.js";

const MAX_METHODS = 3;

const methodSelect = {
  id:        true,
  method:    true,
  number:    true,
  isActive:  true,
  createdAt: true,
};

// GET /api/payment-methods
export async function getMyPaymentMethods(req, res) {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where:   { userId: req.user.id },
      orderBy: { createdAt: "asc" },
      select:  methodSelect,
    });

    return sendResponse(res, true, "Moyens de paiement récupérés.", methods);
  } catch (error) {
    console.error("[PAYMENT_GET]", error);
    return sendResponse(res, false, "Erreur serveur.");
  }
}

// POST /api/payment-methods
export async function addPaymentMethod(req, res) {
  const parsed = createPaymentMethodSchema.safeParse(req.body);
  if (!parsed.success) {
    const error = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return sendResponse(res, false, error);
  }

  const userId = req.user.id;
  const { method, number } = parsed.data;

  try {
    const count = await prisma.paymentMethod.count({ where: { userId } });
    if (count >= MAX_METHODS) {
      return sendResponse(res, false, `Vous ne pouvez pas ajouter plus de ${MAX_METHODS} moyens de paiement.`);
    }

    const created = await prisma.paymentMethod.create({
      data:   { method, number, isActive: count === 0, userId },
      select: methodSelect,
    });

    return sendResponse(res, true, "Moyen de paiement ajouté.", created);
  } catch (error) {
    console.error("[PAYMENT_ADD]", error);
    return sendResponse(res, false, "Erreur serveur.");
  }
}

// PATCH /api/payment-methods/:id/activate
export async function activatePaymentMethod(req, res) {
  const { id }  = req.params;
  const userId  = req.user.id;

  try {
    const method = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!method)                return sendResponse(res, false, "Moyen de paiement introuvable.");
    if (method.userId !== userId) return sendResponse(res, false, "Accès refusé.");
    if (method.isActive)        return sendResponse(res, false, "Ce moyen est déjà actif.");

    await prisma.$transaction([
      prisma.paymentMethod.updateMany({ where: { userId, isActive: true }, data: { isActive: false } }),
      prisma.paymentMethod.update({ where: { id }, data: { isActive: true } }),
    ]);

    const updated = await prisma.paymentMethod.findMany({
      where:   { userId },
      orderBy: { createdAt: "asc" },
      select:  methodSelect,
    });

    return sendResponse(res, true, "Moyen de paiement activé.", updated);
  } catch (error) {
    console.error("[PAYMENT_ACTIVATE]", error);
    return sendResponse(res, false, "Erreur serveur.");
  }
}

// DELETE /api/payment-methods/:id
export async function deletePaymentMethod(req, res) {
  const { id }  = req.params;
  const userId  = req.user.id;

  try {
    const method = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!method)                  return sendResponse(res, false, "Moyen de paiement introuvable.");
    if (method.userId !== userId) return sendResponse(res, false, "Accès refusé.");

    await prisma.paymentMethod.delete({ where: { id } });

    if (method.isActive) {
      const next = await prisma.paymentMethod.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
      if (next) await prisma.paymentMethod.update({ where: { id: next.id }, data: { isActive: true } });
    }

    const remaining = await prisma.paymentMethod.findMany({
      where:   { userId },
      orderBy: { createdAt: "asc" },
      select:  methodSelect,
    });

    return sendResponse(res, true, "Moyen de paiement supprimé.", remaining);
  } catch (error) {
    console.error("[PAYMENT_DELETE]", error);
    return sendResponse(res, false, "Erreur serveur.");
  }
}