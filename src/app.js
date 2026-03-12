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

const app = express();
app.use(express.static('public'));
app.use(morgan('dev'));
// app.js
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf; // Buffer brut pour Webhook.constructEvent
  },
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