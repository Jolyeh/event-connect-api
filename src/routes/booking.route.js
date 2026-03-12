import { Router } from "express";
import express from "express";
import {
  createBooking,
  bookingStatusSSE,
  fedapayWebhook,
  verifyBooking,
  getMyBookings,
  cancelBooking,
} from "../controllers/booking.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const bookingRoutes = Router();

bookingRoutes.post("/webhook/fedapay", fedapayWebhook); // raw body via app.js verify
bookingRoutes.get("/webhook/fedapay",  (req, res) => res.status(200).json({ received: true }));

bookingRoutes.get("/status/:bookingId", bookingStatusSSE); // SSE
bookingRoutes.get("/verify/:reference", verifyBooking);
bookingRoutes.get("/my", requireAuth, getMyBookings);
bookingRoutes.post("/", createBooking);
bookingRoutes.patch("/:id/cancel", cancelBooking);

bookingRoutes.post("/webhook/test/:bookingId", async (req, res) => {
    req.body = {
      name: "transaction.approved",
      entity: {
        id: "TEST-124",
        amount: req.body.amount ?? 1000,
        payment_method: { type: "MTN" },
        metadata: { bookingId: req.params.bookingId },
      },
    };
    return fedapayWebhook(req, res);
  });

export default bookingRoutes;

/* curl -X POST http://localhost:3000/api/bookings/webhook/test/TON_BOOKING_ID \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}' */