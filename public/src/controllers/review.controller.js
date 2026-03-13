import { createReviewSchema, updateReviewSchema } from "../validations/review.js";
import { prisma } from "../config/prisma.js";
import { sendResponse } from "../utils/response.js";
import { verifyToken } from "../utils/token.js";

const reviewSelect = {
  id: true,
  rating: true,
  message: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: { id: true, firstName: true, lastName: true, image: true },
  },
};

// GET /api/reviews — public : liste tous les avis
export async function getAllReviews(req, res) {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      select: reviewSelect,
    });

    const avg = reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    return res.status(200).json({
      status: true,
      data: reviews,
      total: reviews.length,
      average: avg ? parseFloat(avg) : null,
    });
  } catch (error) {
    console.error("[REVIEW_GET_ALL]", error);
    return sendResponse(res, false, "Erreur serveur.");
  }
}

// GET /api/reviews/me — connecté : récupérer son propre avis
export async function getMyReview(req, res) {
  const token = req.cookies["__Host-token"] || req.cookies.token;
  if (!token) return sendResponse(res, false, "Non autorisé.");

  const decoded = verifyToken(token);
  if (!decoded) return sendResponse(res, false, "Token invalide.");

  try {
    const review = await prisma.review.findFirst({
      where: { userId: decoded.id },
      select: reviewSelect,
    });

    return res.status(200).json({
      status: true,
      data: review ?? null,
    });
  } catch (error) {
    console.error("[REVIEW_GET_MINE]", error);
    return sendResponse(res, false, "Erreur serveur.");
  }
}

// POST /api/reviews — créer ou mettre à jour l'avis de l'utilisateur
export async function upsertReview(req, res) {
  const token = req.cookies["__Host-token"] || req.cookies.token;
  if (!token) return sendResponse(res, false, "Non autorisé.");

  const decoded = verifyToken(token);
  if (!decoded) return sendResponse(res, false, "Token invalide.");

  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    const error = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return sendResponse(res, false, error);
  }

  const userId = decoded.id;

  try {
    const existing = await prisma.review.findFirst({ where: { userId } });

    if (existing) {
      // Mise à jour
      const updated = await prisma.review.update({
        where: { id: existing.id },
        data: parsed.data,
        select: reviewSelect,
      });
      return sendResponse(res, true, "Avis mis à jour avec succès.", updated);
    }

    // Création
    const review = await prisma.review.create({
      data: { ...parsed.data, userId },
      select: reviewSelect,
    });
    return sendResponse(res, true, "Avis publié avec succès.", review);
  } catch (error) {
    console.error("[REVIEW_UPSERT]", error);
    return sendResponse(res, false, "Erreur serveur.");
  }
}

// DELETE /api/reviews/:id — connecté ou admin
export async function deleteReview(req, res) {
  const token = req.cookies["__Host-token"] || req.cookies.token;
  if (!token) return sendResponse(res, false, "Non autorisé.");

  const decoded = verifyToken(token);
  if (!decoded) return sendResponse(res, false, "Token invalide.");

  const { id } = req.params;
  const userId = decoded.id;
  const isAdmin = decoded.role === "ADMIN";

  try {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return sendResponse(res, false, "Avis introuvable.");

    if (!isAdmin && review.userId !== userId) {
      return sendResponse(res, false, "Vous ne pouvez supprimer que vos propres avis.");
    }

    await prisma.review.delete({ where: { id } });
    return sendResponse(res, true, "Avis supprimé.");
  } catch (error) {
    console.error("[REVIEW_DELETE]", error);
    return sendResponse(res, false, "Erreur serveur.");
  }
}