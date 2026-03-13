import { Router } from 'express';
import {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
} from '../controllers/category.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// ── Routes publiques ──────────────────────────────────────────────────────────
router.get('/',            getAllCategories);   // Liste toutes les catégories
router.get('/:identifier', getCategoryById);   // Détail par ID ou slug

// ── Routes admin uniquement ───────────────────────────────────────────────────
router.post(  '/',    requireAuth, requireAdmin, createCategory);   // Créer
router.patch( '/:id', requireAuth, requireAdmin, updateCategory);   // Modifier
router.delete('/:id', requireAuth, requireAdmin, deleteCategory);   // Supprimer

export default router;