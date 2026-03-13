import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import authRoutes from './routes/auth.route.js';
import cookieParser from "cookie-parser";
import { appUrl } from './utils/constant.js';
import eventRoutes from './routes/event.route.js';
import categoryRoutes from './routes/category.route.js';
import { sendResponse } from './utils/response.js';
import multer from "multer";
import reviewRoutes from './routes/review.route.js';
import newsletterRoutes from './routes/newsletter.route.js';
import paymentMethodRoutes from './routes/paymentMethod.route.js';
import bookingRoutes from './routes/booking.route.js';
import { sendEmail } from './utils/mail.js';
import ticketRoutes from "./routes/ticket.routes.js";

const app = express();
app.use(express.static('public'));
app.use(morgan('dev'));
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf; // Buffer brut pour Webhook.constructEvent
    },
    limit: '50mb', extended: true
}));
app.use(cors({
    origin: appUrl,
    credentials: true,
}));
app.use(cookieParser());

//routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/newsletters', newsletterRoutes)
app.use('/api/payment-methods', paymentMethodRoutes)
app.use('/api/bookings', bookingRoutes)
app.use("/api/tickets", ticketRoutes);
app.post('/api/send-mail', async (req, res) => {
    const { to, subject, content } = req.body;
    const isSent = await sendEmail(to, subject, content);
    if (!isSent) {
        return sendResponse(res, false, "Email non envoyé");
    }
    return sendResponse(res, true, "Email envoyé")
})
// middleware d'erreur
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return sendResponse(res, false, "L'image ne doit pas dépasser 2 Mo");
        }

        return sendResponse(res, false, "Erreur lors de l'upload");

    }

    if (err) {
        return sendResponse(res, false, err.message || "Erreur serveur");
    }

    next();
});

export default app;