/**
 * Category Validation Schemas
 *
 * LAYER: interfaces
 */

import { z } from "zod";

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required.")
    .max(100, "Category name must be at most 100 characters."),
});

export const deleteCategorySchema = z.object({
  id: z.string().min(1, "Category id is required."),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
