/**
 * Supplier Validation Schemas
 *
 * LAYER: interfaces
 */

import { z } from "zod";

const optionalTrimmedString = (max: number, label: string) =>
  z
    .preprocess(
      (v) => {
        if (v === null || v === undefined) return undefined;
        if (typeof v !== "string") return v;
        const trimmed = v.trim();
        return trimmed.length === 0 ? undefined : trimmed;
      },
      z.string().max(max, `${label} no puede superar ${max} caracteres.`),
    )
    .optional();

export const createSupplierSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es obligatorio.")
    .max(200, "El nombre no puede superar 200 caracteres.")
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, "El nombre es obligatorio."),
  email: z
    .preprocess(
      (v) => {
        if (v === null || v === undefined) return undefined;
        if (typeof v !== "string") return v;
        const trimmed = v.trim();
        return trimmed.length === 0 ? undefined : trimmed;
      },
      z
        .string()
        .max(200, "El email no puede superar 200 caracteres.")
        .email("Email inválido."),
    )
    .optional(),
  phone: optionalTrimmedString(30, "El teléfono"),
  notes: optionalTrimmedString(1000, "Las notas"),
});

export const updateSupplierSchema = createSupplierSchema.extend({
  id: z.string().min(1, "El id del proveedor es obligatorio."),
});

export const deleteSupplierSchema = z.object({
  id: z.string().min(1, "El id del proveedor es obligatorio."),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type DeleteSupplierInput = z.infer<typeof deleteSupplierSchema>;
