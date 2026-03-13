import { z } from "zod";

const ALLOWED_METHODS = ["MTN", "MOOV", "WAVE", "BANK"];

export const createPaymentMethodSchema = z.object({
  method: z
    .enum(["MTN", "MOOV", "WAVE", "BANK"], {
      required_error: "Le moyen de paiement est requis.",
      message: `Le moyen doit être l'un des suivants : ${ALLOWED_METHODS.join(", ")}.`,
    }),

  number: z
    .string({ required_error: "Le numéro est requis." })
    .trim()
    .min(6,  "Le numéro est trop court.")
    .max(34, "Le numéro est trop long."),
});

export const setActiveSchema = z.object({
  id: z
    .string({ required_error: "L'identifiant est requis." })
    .min(1, "L'identifiant est requis."),
});
