import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z
    .number({ required_error: "La note est requise.", invalid_type_error: "La note doit être un nombre." })
    .int("La note doit être un entier.")
    .min(1, "La note minimum est 1.")
    .max(5, "La note maximum est 5."),

  message: z
    .string({ required_error: "Le message est requis." })
    .trim()
    .min(10, "Le message doit contenir au moins 10 caractères.")
    .max(500, "Le message ne peut pas dépasser 500 caractères."),
});

export const updateReviewSchema = createReviewSchema.partial();
