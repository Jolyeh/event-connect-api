import { z } from 'zod';

const slugify = (str) =>
    str.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

export const createCategorySchema = z.object({
    name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(50),
    slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug invalide (minuscules, chiffres et tirets uniquement)').optional(),
    description: z.string().max(300).optional().nullable(),
    icon: z.string().max(10).optional().nullable(),
});

export const updateCategorySchema = z.object({
    name: z.string().min(2).max(50).optional(),
    slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug invalide').optional(),
    description: z.string().max(300).optional().nullable(),
    icon: z.string().max(10).optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'Au moins un champ est requis pour la mise à jour',
});

export { slugify };