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
