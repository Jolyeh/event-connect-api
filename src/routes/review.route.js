import { Router } from "express";
import { getAllReviews, getMyReview, upsertReview, deleteReview } from "../controllers/review.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const reviewRoutes = Router();

reviewRoutes.get("/", getAllReviews);
reviewRoutes.get("/me", getMyReview);            // avis de l'utilisateur connecté
reviewRoutes.post("/", upsertReview);           // create ou update automatiquement
reviewRoutes.delete("/:id", requireAuth, deleteReview);

export default reviewRoutes;