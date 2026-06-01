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

export const restoreProductSchema = z.object({
  id: z.string().min(1, "Product id is required."),
});

export const hardDeleteProductSchema = z.object({
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

/**
 * T27 — sort param parser. URL shape: `?sort=<field>:<direction>` where
 * `<field>` ∈ {name, price, stock} and `<direction>` ∈ {asc, desc}. The
 * action parses the raw string into a typed `{field, direction}` object
 * before passing it to the use case.
 */
const sortFieldSchema = z.enum(["name", "price", "stock"]);
const sortDirectionSchema = z.enum(["asc", "desc"]);

export const productSortStringSchema = z
  .string()
  .regex(/^(name|price|stock):(asc|desc)$/, "El sort debe tener la forma <campo>:<asc|desc>.")
  .transform((s) => {
    const [field, direction] = s.split(":") as [
      z.infer<typeof sortFieldSchema>,
      z.infer<typeof sortDirectionSchema>,
    ];
    return { field, direction };
  });

export function parseSortParam(
  raw: string | undefined,
): { field: "name" | "price" | "stock"; direction: "asc" | "desc" } | undefined {
  if (raw === undefined) return undefined;
  const result = productSortStringSchema.safeParse(raw);
  return result.success ? result.data : undefined;
}

export const listProductsSchema = z.object({
  name: z.string().optional(),
  categoryId: z.string().optional(),
  skuContains: z.string().optional(),
  supplierId: z.string().optional(),
  sort: productSortStringSchema.optional(),
});

/**
 * T28 — export filters. Only q (mapped to `name`) and `sort` are honoured;
 * page/limit are intentionally absent because the export covers the whole
 * filtered resultset, not a single page.
 */
export const exportProductsSchema = z
  .object({
    name: z.string().optional(),
    sort: productSortStringSchema.optional(),
  })
  .strip();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type DeleteProductInput = z.infer<typeof deleteProductSchema>;
export type RestoreProductInput = z.infer<typeof restoreProductSchema>;
export type HardDeleteProductInput = z.infer<typeof hardDeleteProductSchema>;
export type DeleteProductsBulkInput = z.infer<typeof deleteProductsBulkSchema>;
export type ListProductsInput = z.infer<typeof listProductsSchema>;
export type ExportProductsInput = z.infer<typeof exportProductsSchema>;
