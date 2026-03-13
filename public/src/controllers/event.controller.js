import { prisma } from '../config/prisma.js';
import { sendResponse } from '../utils/response.js';
import { createEventSchema, changeStatusSchema } from '../validations/event.js';

// ─── Sélection commune pour les listes ────────────────────────────────────────
const EVENT_LIST_SELECT = {
    id: true,
    title: true,
    description: true,
    status: true,
    isVedette: true,
    dateStart: true,
    timeStart: true,
    dateEnd: true,
    timeEnd: true,
    multiDay: true,
    isOnline: true,
    venue: true,
    city: true,
    coverImage: true,
    isFree: true,
    capacity: true,
    createdAt: true,
    category: { select: { id: true, name: true, slug: true, icon: true } },
    tags: { select: { id: true, name: true, slug: true } },
    organizer: { select: { id: true, firstName: true, lastName: true, email: true, image: true } },
    tickets: { select: { id: true, name: true, price: true, quantity: true, sold: true } },
};

// ─── Sélection complète pour le détail ────────────────────────────────────────
const EVENT_DETAIL_SELECT = {
    ...EVENT_LIST_SELECT,
    onlineUrl: true,
    address: true,
    gallery: true,
    saleStart: true,
    saleEnd: true,
    ageRestriction: true,
    contactEmail: true,
    website: true,
    updatedAt: true,
    bookings: true,
};

// ─── Vérification et passage auto en COMPLETED ────────────────────────────────
const autoCompleteExpiredEvents = async () => {
    const now = new Date();
    await prisma.event.updateMany({
        where: {
            status: 'PUBLISHED',
            dateStart: { lt: now },
            dateEnd: null,
        },
        data: { status: 'COMPLETED' },
    });
    await prisma.event.updateMany({
        where: {
            status: 'PUBLISHED',
            dateEnd: { lt: now },
        },
        data: { status: 'COMPLETED' },
    });
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/events — Créer un événement
// ──────────────────────────────────────────────────────────────────────────────
export const createEvent = async (req, res) => {
    try {
        // Récupération de l'image cover uploadée
        if (!req.file) return sendResponse(res, false, "L'image principale est requise");

        const coverImage = `uploads/events/${req.file.filename}`;

        // Fusion du body avec les champs parsés
        const rawBody = { ...req.body };

        // Conversion des types (multipart/form-data envoie tout en string)
        if (rawBody.tagNames) rawBody.tagNames = JSON.parse(rawBody.tagNames);
        if (rawBody.tickets)  rawBody.tickets  = JSON.parse(rawBody.tickets);
        if (rawBody.gallery)  rawBody.gallery  = JSON.parse(rawBody.gallery);
        if (rawBody.multiDay  !== undefined) rawBody.multiDay  = rawBody.multiDay  === 'true';
        if (rawBody.isOnline  !== undefined) rawBody.isOnline  = rawBody.isOnline  === 'true';
        if (rawBody.isFree    !== undefined) rawBody.isFree    = rawBody.isFree    === 'true';
        if (rawBody.capacity) rawBody.capacity = parseInt(rawBody.capacity);

        const parsed = createEventSchema.safeParse(rawBody);

        if (!parsed.success) {
            const error = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0]
                || parsed.error.errors[0]?.message;
            return sendResponse(res, false, error);
        }

        const {
            title, description, categoryId, tagNames,
            dateStart, timeStart, dateEnd, timeEnd, multiDay,
            isOnline, onlineUrl, venue, address, city, capacity,
            gallery, isFree, saleStart, saleEnd, tickets,
            ageRestriction, contactEmail, website,
        } = parsed.data;

        // Vérification catégorie
        const category = await prisma.category.findUnique({ where: { id: categoryId } });
        if (!category) return sendResponse(res, false, 'Catégorie introuvable');

        // Upsert tags — insensible à la casse (Aze = aze = AZE)
        // On normalise en minuscules pour la comparaison et le slug
        const resolvedTagIds = await Promise.all(
            tagNames.map(async (rawName) => {
                const normalized = rawName.trim().toLowerCase();
                const slug = normalized.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

                // Cherche un tag existant (insensible à la casse via lowercase)
                const existing = await prisma.tag.findFirst({
                    where: { slug },
                });

                if (existing) return existing.id;

                // Crée le tag s'il n'existe pas
                // Le nom affiché conserve la casse d'origine (première occurrence)
                const created = await prisma.tag.create({
                    data: {
                        name: rawName.trim(),
                        slug,
                    },
                });

                return created.id;
            })
        );

        // Dédoublonnage (deux variantes du même tag → un seul ID)
        const tagIds = [...new Set(resolvedTagIds)];

        // Création de l'événement avec ses tickets en transaction
        const event = await prisma.$transaction(async (tx) => {
            const newEvent = await tx.event.create({
                data: {
                    title,
                    description,
                    categoryId,
                    tagIds,
                    dateStart: new Date(dateStart),
                    timeStart: timeStart || null,
                    dateEnd: dateEnd ? new Date(dateEnd) : null,
                    timeEnd: timeEnd || null,
                    multiDay,
                    isOnline,
                    onlineUrl: onlineUrl || null,
                    venue: venue || null,
                    address: address || null,
                    city: city || null,
                    capacity: capacity || null,
                    coverImage,
                    gallery,
                    isFree,
                    saleStart: saleStart ? new Date(saleStart) : null,
                    saleEnd: saleEnd ? new Date(saleEnd) : null,
                    ageRestriction: ageRestriction || null,
                    contactEmail: contactEmail || null,
                    website: website || null,
                    organizerId: req.user.id,
                },
            });

            if (tickets.length > 0) {
                await tx.ticket.createMany({
                    data: tickets.map((t) => ({
                        ...t,
                        eventId: newEvent.id,
                    })),
                });
            }

            return newEvent;
        });

        return sendResponse(res, true, 'Événement créé avec succès', { id: event.id });
    } catch (error) {
        console.error('[CREATE_EVENT]', error);
        return sendResponse(res, false, 'Erreur serveur');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/events — Tous les événements publiés
// ──────────────────────────────────────────────────────────────────────────────
export const getAllEvents = async (req, res) => {
    try {
        //await autoCompleteExpiredEvents();

        const events = await prisma.event.findMany({
            where: { status: 'PUBLISHED' },
            select: EVENT_LIST_SELECT,
            orderBy: [{ isVedette: 'desc' }, { dateStart: 'asc' }],
        });

        return sendResponse(res, true, 'Liste des événements', events);
    } catch (error) {
        console.error('[GET_ALL_EVENTS]', error);
        return sendResponse(res, false, 'Erreur serveur');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/events/admin — Tous les événements (admin)
// ──────────────────────────────────────────────────────────────────────────────
export const getAllEventsAdmin = async (req, res) => {
    try {
        //await autoCompleteExpiredEvents();

        const events = await prisma.event.findMany({
            select: EVENT_LIST_SELECT,
            orderBy: [{ createdAt: 'desc' }],
        });

        return sendResponse(res, true, 'Liste complète des événements', events);
    } catch (error) {
        console.error('[GET_ALL_EVENTS_ADMIN]', error);
        return sendResponse(res, false, 'Erreur serveur');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/events/:id — Détail d'un événement
// ──────────────────────────────────────────────────────────────────────────────
export const getEventById = async (req, res) => {
    try {
        //await autoCompleteExpiredEvents();

        const { id } = req.params;

        const event = await prisma.event.findUnique({
            where: { id },
            select: EVENT_DETAIL_SELECT,
        });

        if (!event) return sendResponse(res, false, 'Événement introuvable');

        return sendResponse(res, true, 'Détail de l\'événement', event);
    } catch (error) {
        console.error('[GET_EVENT_BY_ID]', error);
        return sendResponse(res, false, 'Erreur serveur');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/events/category/:slug — Par catégorie
// ──────────────────────────────────────────────────────────────────────────────
export const getEventsByCategory = async (req, res) => {
    try {
        //await autoCompleteExpiredEvents();

        const { slug } = req.params;

        const category = await prisma.category.findUnique({ where: { slug } });
        if (!category) return sendResponse(res, false, 'Catégorie introuvable');

        const events = await prisma.event.findMany({
            where: {
                status: 'PUBLISHED',
                categoryId: category.id,
            },
            select: EVENT_LIST_SELECT,
            orderBy: [{ isVedette: 'desc' }, { dateStart: 'asc' }],
        });

        return sendResponse(res, true, `Événements de la catégorie "${category.name}"`, events);
    } catch (error) {
        console.error('[GET_EVENTS_BY_CATEGORY]', error);
        return sendResponse(res, false, 'Erreur serveur');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/events/tag/:slug — Par tag
// ──────────────────────────────────────────────────────────────────────────────
export const getEventsByTag = async (req, res) => {
    try {
        //await autoCompleteExpiredEvents();

        const { slug } = req.params;

        const tag = await prisma.tag.findUnique({ where: { slug } });
        if (!tag) return sendResponse(res, false, 'Tag introuvable');

        const events = await prisma.event.findMany({
            where: {
                status: 'PUBLISHED',
                tagIds: { has: tag.id },
            },
            select: EVENT_LIST_SELECT,
            orderBy: [{ isVedette: 'desc' }, { dateStart: 'asc' }],
        });

        return sendResponse(res, true, `Événements avec le tag "${tag.name}"`, events);
    } catch (error) {
        console.error('[GET_EVENTS_BY_TAG]', error);
        return sendResponse(res, false, 'Erreur serveur');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/events/organizer/:organizerId — Par organisateur
// ──────────────────────────────────────────────────────────────────────────────
export const getEventsByOrganizer = async (req, res) => {
    try {
        //await autoCompleteExpiredEvents();

        const { organizerId } = req.params;

        const organizer = await prisma.user.findUnique({ where: { id: organizerId } });
        if (!organizer) return sendResponse(res, false, 'Organisateur introuvable');

        // Un organisateur ne voit que ses propres events (tous statuts)
        // Un visiteur ne voit que les publiés
        const isOwnerOrAdmin =
            req.user?.id === organizerId || req.user?.role === 'ADMIN';

        const events = await prisma.event.findMany({
            where: {
                organizerId,
                ...(!isOwnerOrAdmin && { status: 'PUBLISHED' }),
            },
            select: EVENT_LIST_SELECT,
            orderBy: [{ createdAt: 'desc' }],
        });

        return sendResponse(
            res,
            true,
            `Événements de ${organizer.firstName} ${organizer.lastName}`,
            events
        );
    } catch (error) {
        console.error('[GET_EVENTS_BY_ORGANIZER]', error);
        return sendResponse(res, false, 'Erreur serveur');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/events/:id — Supprimer un événement
// ──────────────────────────────────────────────────────────────────────────────
export const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const event = await prisma.event.findUnique({ where: { id } });
        if (!event) return sendResponse(res, false, 'Événement introuvable');

        // Seul l'organisateur propriétaire ou un admin peut supprimer
        const isOwner = event.organizerId === req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        if (!isOwner && !isAdmin) {
            return sendResponse(res, false, 'Vous n\'êtes pas autorisé à supprimer cet événement');
        }

        // Impossible de supprimer un événement avec des réservations confirmées
        const confirmedBookings = await prisma.booking.count({
            where: { eventId: id, status: 'CONFIRMED' },
        });

        if (confirmedBookings > 0) {
            return sendResponse(
                res,
                false,
                'Impossible de supprimer un événement ayant des réservations confirmées'
            );
        }

        await prisma.event.delete({ where: { id } });

        return sendResponse(res, true, 'Événement supprimé avec succès');
    } catch (error) {
        console.error('[DELETE_EVENT]', error);
        return sendResponse(res, false, 'Erreur serveur');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/events/:id/vedette — Mettre/retirer en vedette (admin)
// ──────────────────────────────────────────────────────────────────────────────
export const toggleVedette = async (req, res) => {
    try {
        const { id } = req.params;

        const event = await prisma.event.findUnique({
            where: { id },
            select: { id: true, isVedette: true, title: true },
        });

        if (!event) return sendResponse(res, false, 'Événement introuvable');

        const updated = await prisma.event.update({
            where: { id },
            data: { isVedette: !event.isVedette },
            select: { id: true, isVedette: true, title: true },
        });

        const msg = updated.isVedette
            ? 'Événement mis en vedette'
            : 'Événement retiré de la vedette';

        return sendResponse(res, true, msg, updated);
    } catch (error) {
        console.error('[TOGGLE_VEDETTE]', error);
        return sendResponse(res, false, 'Erreur serveur');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/events/:id/status — Changer le statut (admin)
// ──────────────────────────────────────────────────────────────────────────────
export const changeStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const parsed = changeStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            const error = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
            return sendResponse(res, false, error);
        }

        const { status } = parsed.data;

        const event = await prisma.event.findUnique({
            where: { id },
            select: { id: true, status: true, title: true },
        });

        if (!event) return sendResponse(res, false, 'Événement introuvable');

        // Transitions de statut autorisées
        const allowedTransitions = {
            PENDING: ['PUBLISHED', 'CANCELLED'],
            PUBLISHED: ['CANCELLED', 'COMPLETED'],
            CANCELLED: [],
            COMPLETED: [],
        };

        if (!allowedTransitions[event.status].includes(status)) {
            return sendResponse(
                res,
                false,
                `Transition invalide : ${event.status} → ${status}`
            );
        }

        const updated = await prisma.event.update({
            where: { id },
            data: { status },
            select: { id: true, status: true, title: true },
        });

        const labels = {
            PUBLISHED: 'publié',
            CANCELLED: 'annulé',
            COMPLETED: 'marqué comme terminé',
        };

        return sendResponse(
            res,
            true,
            `Événement ${labels[status] || 'mis à jour'}`,
            updated
        );
    } catch (error) {
        console.error('[CHANGE_STATUS]', error);
        return sendResponse(res, false, 'Erreur serveur');
    }
};