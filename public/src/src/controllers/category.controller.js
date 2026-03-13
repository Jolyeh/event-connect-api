import { prisma } from '../config/prisma.js';
import { sendResponse } from '../utils/response.js';
import { createCategorySchema, updateCategorySchema, slugify } from '../validations/category.js';

// ─── Sélection commune ────────────────────────────────────────────────────────
const CATEGORY_SELECT = {
    id: true,
    name: true,
    slug: true,
    description: true,
    icon: true,
    createdAt: true,
    updatedAt: true,
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/categories — Liste toutes les catégories
// ──────────────────────────────────────────────────────────────────────────────
export const getAllCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            select: {
                ...CATEGORY_SELECT,
                _count: { select: { events: true } },
            },
            orderBy: { name: 'asc' },
        });

        return sendResponse(res, true, 'Catégories récupérées', categories);
    } catch (error) {
        console.error('[GET_ALL_CATEGORIES]', error);
        return sendResponse(res, false, 'Erreur serveur');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/categories/:identifier — Détail par ID ou slug
// ──────────────────────────────────────────────────────────────────────────────
export const getCategoryById = async (req, res) => {
    try {
        const { identifier } = req.params;

        // Accepte un ObjectId (24 hex) ou un slug
        const isObjectId = /^[a-f\d]{24}$/i.test(identifier);

        const category = await prisma.category.findUnique({
            where: isObjectId ? { id: identifier } : { slug: identifier },
            select: {
                ...CATEGORY_SELECT,
                _count: { select: { events: true } },
            },
        });

        if (!category) return sendResponse(res, false, 'Catégorie introuvable');

        return sendResponse(res, true, 'Catégorie récupérée', category);
    } catch (error) {
        console.error('[GET_CATEGORY_BY_ID]', error);
        return sendResponse(res, false, 'Erreur serveur');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/categories — Créer une catégorie (admin)
// ──────────────────────────────────────────────────────────────────────────────
export const createCategory = async (req, res) => {
    try {
        const parsed = createCategorySchema.safeParse(req.body);
        if (!parsed.success) {
            const error = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0]
                || parsed.error.errors[0]?.message;
            return sendResponse(res, false, error);
        }

        const { name, description, icon } = parsed.data;

        // Génération automatique du slug si non fourni
        const slug = parsed.data.slug ?? slugify(name);

        // Unicité du nom et du slug
        const existing = await prisma.category.findFirst({
            where: { OR: [{ name: { equals: name, mode: 'insensitive' } }, { slug }] },
        });
        if (existing) {
            const field = existing.slug === slug ? 'slug' : 'nom';
            return sendResponse(res, false, `Ce ${field} est déjà utilisé`);
        }

        const category = await prisma.category.create({
            data: { name, slug, description: description ?? null, icon: icon ?? null },
            select: CATEGORY_SELECT,
        });

        return sendResponse(res, true, 'Catégorie créée avec succès', category);
    } catch (error) {
        console.error('[CREATE_CATEGORY]', error);
        return sendResponse(res, false, 'Erreur serveur');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/categories/:id — Mettre à jour une catégorie (admin)
// ──────────────────────────────────────────────────────────────────────────────
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await prisma.category.findUnique({ where: { id } });
        if (!category) return sendResponse(res, false, 'Catégorie introuvable');

        const parsed = updateCategorySchema.safeParse(req.body);
        if (!parsed.success) {
            const error = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0]
                || parsed.error.errors[0]?.message;
            return sendResponse(res, false, error);
        }

        const { name, description, icon } = parsed.data;

        // Si le nom change, recalcule le slug (sauf si slug fourni explicitement)
        let slug = parsed.data.slug;
        if (name && !slug) slug = slugify(name);

        // Vérification d'unicité sur les champs modifiés uniquement
        if (name || slug) {
            const conditions = [];
            if (name)  conditions.push({ name: { equals: name, mode: 'insensitive' } });
            if (slug)  conditions.push({ slug });

            const conflict = await prisma.category.findFirst({
                where: { OR: conditions, NOT: { id } },
            });
            if (conflict) {
                const field = conflict.slug === slug ? 'slug' : 'nom';
                return sendResponse(res, false, `Ce ${field} est déjà utilisé par une autre catégorie`);
            }
        }

        const updated = await prisma.category.update({
            where: { id },
            data: {
                ...(name        !== undefined && { name }),
                ...(slug        !== undefined && { slug }),
                ...(description !== undefined && { description }),
                ...(icon        !== undefined && { icon }),
            },
            select: CATEGORY_SELECT,
        });

        return sendResponse(res, true, 'Catégorie mise à jour', updated);
    } catch (error) {
        console.error('[UPDATE_CATEGORY]', error);
        return sendResponse(res, false, 'Erreur serveur');
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/categories/:id — Supprimer une catégorie (admin)
// ──────────────────────────────────────────────────────────────────────────────
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await prisma.category.findUnique({
            where: { id },
            include: { _count: { select: { events: true } } },
        });

        if (!category) return sendResponse(res, false, 'Catégorie introuvable');

        // Blocage si des événements sont liés
        if (category._count.events > 0) {
            return sendResponse(
                res, false,
                `Impossible de supprimer : ${category._count.events} événement(s) utilisent cette catégorie`
            );
        }

        await prisma.category.delete({ where: { id } });

        return sendResponse(res, true, 'Catégorie supprimée avec succès');
    } catch (error) {
        console.error('[DELETE_CATEGORY]', error);
        return sendResponse(res, false, 'Erreur serveur');
    }
};