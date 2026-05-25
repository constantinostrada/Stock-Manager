/**
 * Stock Validation Schemas
 *
 * Zod schemas for validating stock-related user input.
 *
 * LAYER: interfaces
 */

import { z } from "zod";

export const adjustStockSchema = z.object({
  productId: z.string().min(1, "Product id is required."),
  type: z.enum(["IN", "OUT", "ADJUSTMENT"], {
    errorMap: () => ({ message: "Type must be IN, OUT, or ADJUSTMENT." }),
  }),
  quantity: z
    .number({ invalid_type_error: "Quantity must be a number." })
    .int("Quantity must be a whole number.")
    .positive("Quantity must be greater than zero."),
  reason: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
});

export const listStockMovementsSchema = z.object({
  productId: z.string().optional(),
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type ListStockMovementsInput = z.infer<typeof listStockMovementsSchema>;
