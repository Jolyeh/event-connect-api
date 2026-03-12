import { Router } from "express";
import {
  getMyPaymentMethods,
  addPaymentMethod,
  activatePaymentMethod,
  deletePaymentMethod,
} from "../controllers/paymentMethod.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const paymentMethodRoutes = Router();

paymentMethodRoutes.get("/",                requireAuth, getMyPaymentMethods);
paymentMethodRoutes.post("/",               requireAuth, addPaymentMethod);
paymentMethodRoutes.patch("/:id/activate",  requireAuth, activatePaymentMethod);
paymentMethodRoutes.delete("/:id",          requireAuth, deletePaymentMethod);

export default paymentMethodRoutes;
