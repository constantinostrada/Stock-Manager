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
  stockInicial: z
    .number({ invalid_type_error: "El stock inicial debe ser un número." })
    .int("El stock inicial debe ser un número entero.")
    .min(0, "El stock inicial no puede ser negativo.")
    .default(0),
});

export const updateProductSchema = z.object({
  id: z.string().min(1, "Product id is required."),
  name: z
    .string()
    .min(1, "Product name is required.")
    .max(200)
    .optional(),
  description: z
    .string()
    .max(1000)
    .nullable()
    .optional(),
  price: z
    .number({ invalid_type_error: "Price must be a number." })
    .min(0)
    .optional(),
  currency: z.string().length(3).optional(),
  categoryId: z.string().nullable().optional(),
});

export const deleteProductSchema = z.object({
  id: z.string().min(1, "Product id is required."),
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
export type ListProductsInput = z.infer<typeof listProductsSchema>;
