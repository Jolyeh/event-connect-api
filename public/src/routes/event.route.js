import { Router } from 'express';
import {
    createEvent,
    getAllEvents,
    getAllEventsAdmin,
    getEventById,
    getEventsByCategory,
    getEventsByTag,
    getEventsByOrganizer,
    deleteEvent,
    toggleVedette,
    changeStatus,
} from '../controllers/event.controller.js';
import { upload } from '../middleware/upload.middleware.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const eventRoutes = Router();

// ─── Lecture publique ──────────────────────────────────────────────────────────
eventRoutes.get('/', getAllEvents);
eventRoutes.get('/category/:slug', getEventsByCategory);
eventRoutes.get('/tag/:slug', getEventsByTag);
// L'organisateur peut voir ses propres events (tous statuts) via requireAuth optionnel
eventRoutes.get('/organizer/:organizerId', (req, res, next) => {
    const token = req.cookies?.['__Host-token'] || req.cookies?.token;
    if (token) requireAuth(req, res, next);
    else next();
}, getEventsByOrganizer);
eventRoutes.get('/:id', getEventById);

// ─── Admin ────────────────────────────────────────────────────────────────────
eventRoutes.get('/admin/all', requireAuth, requireAdmin, getAllEventsAdmin);
eventRoutes.patch('/:id/vedette', requireAuth, requireAdmin, toggleVedette);
eventRoutes.patch('/:id/status', requireAuth, changeStatus);

// ─── Organisateur authentifié ─────────────────────────────────────────────────
eventRoutes.post(
    '/',
    requireAuth,
    upload('events').single('coverImage'),
    createEvent
);
eventRoutes.delete('/:id', requireAuth, deleteEvent);

export default eventRoutes;
