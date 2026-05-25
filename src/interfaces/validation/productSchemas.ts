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
    .min(1, "Product name is required.")
    .max(200, "Product name must be at most 200 characters."),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters.")
    .optional(),
  sku: z
    .string()
    .min(2, "SKU must be at least 2 characters.")
    .max(50, "SKU must be at most 50 characters."),
  price: z
    .number({ invalid_type_error: "Price must be a number." })
    .min(0, "Price cannot be negative."),
  currency: z
    .string()
    .length(3, "Currency must be a 3-letter ISO code.")
    .optional()
    .default("USD"),
  categoryId: z.string().optional(),
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
