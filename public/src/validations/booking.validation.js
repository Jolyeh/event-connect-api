import { z } from "zod";

export const createBookingSchema = z.object({
  eventId: z
    .string({ required_error: "L'identifiant de l'événement est requis." })
    .min(1, "L'identifiant de l'événement est requis."),

  userName: z
    .string({ required_error: "Le nom est requis." })
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères."),

  userEmail: z
    .string({ required_error: "L'email est requis." })
    .trim()
    .email("Adresse email invalide."),

  userPhone: z
    .string({ required_error: "Le téléphone est requis." })
    .trim()
    .min(8, "Numéro de téléphone invalide."),

  isFree: z.boolean().optional(),

  items: z
    .array(
      z.object({
        ticketId: z.string({ required_error: "L'identifiant du billet est requis." }),
        quantity: z
          .number({ required_error: "La quantité est requise." })
          .int()
          .min(1, "La quantité minimum est 1.")
          .max(8, "La quantité maximum est 8."),
      })
    )
    .optional()
    .default([]),
}).refine(
  (data) => data.isFree || (data.items && data.items.length > 0),
  {
    message: "Sélectionnez au moins un billet.",
    path: ["items"],
  }
);