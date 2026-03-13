import { verifyToken } from '../utils/token.js';
import { sendResponse } from '../utils/response.js';

export const requireAuth = (req, res, next) => {
    const token = req.cookies['__Host-token'] || req.cookies.token;

    if (!token) {
        return sendResponse(res, false, 'Non autorisé');
    }

    const decoded = verifyToken(token);

    if (!decoded) {
        return sendResponse(res, false, 'Session invalide ou expirée');
    }

    req.user = decoded;
    next();
};

export const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'ADMIN') {
        return sendResponse(res, false, 'Accès réservé aux administrateurs');
    }
    next();
};
