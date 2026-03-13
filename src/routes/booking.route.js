import { Router } from "express";
import {
  createBooking,
  bookingStatusSSE,
  fedapayWebhook,
  verifyBooking,
  getMyBookings,
  cancelBooking,
  sendTickets,
} from "../controllers/booking.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const bookingRoutes = Router();

bookingRoutes.post("/webhook/fedapay", fedapayWebhook);
bookingRoutes.get("/webhook/fedapay", (req, res) => res.status(200).json({ received: true }));

bookingRoutes.get("/status/:bookingId", bookingStatusSSE); // SSE
bookingRoutes.get("/verify/:reference", verifyBooking);
bookingRoutes.get("/my", requireAuth, getMyBookings);
bookingRoutes.post("/", createBooking);
bookingRoutes.post('/:id/send-tickets', sendTickets);
bookingRoutes.patch("/:id/cancel", cancelBooking);


export default bookingRoutes;