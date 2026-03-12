import { Router } from "express";
import { subscribe, unsubscribe, getAllSubscribers } from "../controllers/newsletter.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const newsletterRoutes = Router();

// Public
newsletterRoutes.post("/subscribe",   subscribe);
newsletterRoutes.delete("/unsubscribe", unsubscribe);

// Admin seulement
newsletterRoutes.get("/", requireAuth, requireAdmin, getAllSubscribers);

export default newsletterRoutes;
