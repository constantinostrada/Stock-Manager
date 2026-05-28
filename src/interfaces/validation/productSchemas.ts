/**
 * Product Validation Schemas
 *
 * Zod schemas for validating user input at the interface boundary.
 * Only structural/format validation — business rules stay in domain.
 *
 * LAYER: interfaces
 */

import { z } from "zod";

export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido.")
    .max(200, "El nombre debe tener como máximo 200 caracteres."),
  description: z
    .string()
    .max(1000, "La descripción debe tener como máximo 1000 caracteres.")
    .optional(),
  sku: z
    .string()
    .min(2, "El SKU debe tener al menos 2 caracteres.")
    .max(50, "El SKU debe tener como máximo 50 caracteres."),
  price: z
    .number({ invalid_type_error: "El precio debe ser un número." })
    .positive("El precio debe ser mayor a 0."),
  currency: z
    .string()
    .length(3, "La moneda debe ser un código ISO de 3 letras.")
    .optional()
    .default("USD"),
  categoryId: z.string().optional(),
  supplierId: z.string().nullable().optional(),
  stockInicial: z
    .number({ invalid_type_error: "El stock inicial debe ser un número." })
    .int("El stock inicial debe ser un número entero.")
    .min(0, "El stock inicial no puede ser negativo.")
    .default(0),
});

export const updateProductSchema = z.object({
  id: z.string().min(1, "El id del producto es requerido."),
  name: z
    .string()
    .min(1, "El nombre es requerido.")
    .max(200, "El nombre debe tener como máximo 200 caracteres."),
  description: z
    .string()
    .max(1000, "La descripción debe tener como máximo 1000 caracteres.")
    .nullable()
    .optional(),
  price: z
    .number({ invalid_type_error: "El precio debe ser un número." })
    .positive("El precio debe ser mayor a 0."),
  currency: z
    .string()
    .length(3, "La moneda debe ser un código ISO de 3 letras.")
    .optional()
    .default("USD"),
  categoryId: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
});

export const deleteProductSchema = z.object({
  id: z.string().min(1, "Product id is required."),
});

export const deleteProductsBulkSchema = z.object({
  skus: z
    .array(z.string().min(1, "El SKU no puede estar vacío."))
    .min(1, "Debe seleccionar al menos un producto."),
});

export const getProductSchema = z.object({
  id: z.string().min(1, "Product id is required."),
});

export const listProductsSchema = z.object({
  name: z.string().optional(),
  categoryId: z.string().optional(),
  skuContains: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type DeleteProductInput = z.infer<typeof deleteProductSchema>;
export type DeleteProductsBulkInput = z.infer<typeof deleteProductsBulkSchema>;
export type ListProductsInput = z.infer<typeof listProductsSchema>;
