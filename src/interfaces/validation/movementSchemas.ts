/**
 * Movement Validation Schemas
 *
 * Zod schemas for the registerMovement Server Action.
 * Uses the AC's Spanish field names (tipo, cantidad, razon) at the input
 * boundary; the action maps to the use case's English DTO.
 *
 * LAYER: interfaces
 */

import { z } from "zod";

export const registerMovementSchema = z.object({
  productId: z.string().min(1, "El producto es obligatorio."),
  tipo: z.enum(["ENTRADA", "SALIDA"], {
    errorMap: () => ({ message: "El tipo debe ser ENTRADA o SALIDA." }),
  }),
  cantidad: z
    .number({ invalid_type_error: "La cantidad debe ser un número." })
    .int("La cantidad debe ser un número entero.")
    .positive("La cantidad debe ser mayor que cero."),
  razon: z
    .string({ required_error: "La razón es obligatoria." })
    .trim()
    .min(1, "La razón es obligatoria.")
    .max(500, "La razón no puede superar los 500 caracteres."),
});

export type RegisterMovementInput = z.infer<typeof registerMovementSchema>;

/**
 * T14 — `createMovement` schema for the global "+ Nuevo movimiento" dialog
 * on /movements. Differs from registerMovementSchema in three ways:
 *   - tipo also accepts AJUSTE
 *   - razon is OPTIONAL (empty string → undefined)
 *   - productId-not-found is a real validation surface (the user picks
 *     the product, so we must map "producto no existe" to fieldErrors.productId
 *     in the action layer).
 */
export const createMovementSchema = z.object({
  productId: z.string().min(1, "El producto es obligatorio."),
  tipo: z.enum(["ENTRADA", "SALIDA", "AJUSTE"], {
    errorMap: () => ({
      message: "El tipo debe ser ENTRADA, SALIDA o AJUSTE.",
    }),
  }),
  cantidad: z
    .number({ invalid_type_error: "La cantidad debe ser un número." })
    .int("La cantidad debe ser un número entero.")
    .positive("La cantidad debe ser mayor que cero."),
  razon: z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      const trimmed = v.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z
      .string()
      .max(500, "La razón no puede superar los 500 caracteres.")
      .optional(),
  ),
});

export type CreateMovementInput = z.infer<typeof createMovementSchema>;
