/**
 * Product Server Actions
 *
 * Next.js Server Actions for product CRUD operations.
 * Thin controllers: validate input → call use case → return ActionResult.
 *
 * LAYER: interfaces
 */

"use server";

import {
  createProductUseCase,
  listProductsUseCase,
  getProductUseCase,
  getProductBySkuUseCase,
  getProductWithMovementsUseCase,
  updateProductUseCase,
  softDeleteProductUseCase,
  restoreProductUseCase,
  hardDeleteProductUseCase,
  getDeletedProductCountUseCase,
  deleteProductsBulkUseCase,
  exportProductsCsvUseCase,
  importProductsUseCase,
} from "@infrastructure/container";
import {
  createProductSchema,
  updateProductSchema,
  deleteProductSchema,
  restoreProductSchema,
  hardDeleteProductSchema,
  deleteProductsBulkSchema,
  listProductsSchema,
  exportProductsSchema,
  importProductsSchema,
} from "@interfaces/validation/productSchemas";
import { runAction, err, type ActionResult } from "@interfaces/actions/actionHelpers";
import type {
  ProductDTO,
  DeleteProductsBulkResultDTO,
  ImportProductsResultDTO,
} from "@application/dtos/ProductDTO";
import type { GetProductBySkuResultDTO } from "@application/use-cases/product/GetProductBySkuUseCase";
import type { GetProductWithMovementsResultDTO } from "@application/use-cases/product/GetProductWithMovementsUseCase";
import type { ExportProductsCsvResultDTO } from "@application/use-cases/product/ExportProductsCsvUseCase";

export async function createProduct(
  rawInput: unknown,
): Promise<ActionResult<ProductDTO>> {
  const parsed = createProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fieldErrors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(flat.fieldErrors)) {
      if (messages && messages.length > 0) fieldErrors[field] = messages[0]!;
    }
    const message =
      Object.values(fieldErrors).join("; ") ||
      parsed.error.errors.map((e) => e.message).join("; ");
    return err(message, "VALIDATION_ERROR", fieldErrors);
  }
  const result = await runAction(() => createProductUseCase.execute(parsed.data));
  // SKU conflict from the use case maps cleanly to a field-level error.
  if (!result.success && result.code === "CONFLICT") {
    return err(result.error, "CONFLICT", { sku: "El SKU ya existe." });
  }
  return result;
}

export async function listProducts(
  rawInput: unknown = {},
): Promise<ActionResult<ProductDTO[]>> {
  const parsed = listProductsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(parsed.error.errors.map((e) => e.message).join("; "), "VALIDATION_ERROR");
  }
  return runAction(() => listProductsUseCase.execute(parsed.data));
}

export async function getProduct(
  id: string,
): Promise<ActionResult<ProductDTO>> {
  const parsed = { id };
  return runAction(() => getProductUseCase.execute(parsed));
}

export async function getProductBySku(
  sku: string,
): Promise<ActionResult<GetProductBySkuResultDTO>> {
  return runAction(() => getProductBySkuUseCase.execute({ sku }));
}

export async function getProductWithMovements(
  productId: string,
  page = 1,
  limit = 10,
): Promise<ActionResult<GetProductWithMovementsResultDTO>> {
  return runAction(() =>
    getProductWithMovementsUseCase.execute({ product_id: productId, page, limit }),
  );
}

export async function updateProduct(
  rawInput: unknown,
): Promise<ActionResult<ProductDTO>> {
  const parsed = updateProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fieldErrors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(flat.fieldErrors)) {
      if (messages && messages.length > 0) fieldErrors[field] = messages[0]!;
    }
    const message =
      Object.values(fieldErrors).join("; ") ||
      parsed.error.errors.map((e) => e.message).join("; ");
    return err(message, "VALIDATION_ERROR", fieldErrors);
  }
  return runAction(() => updateProductUseCase.execute(parsed.data));
}

export async function deleteProduct(
  rawInput: unknown,
): Promise<ActionResult<void>> {
  const parsed = deleteProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(parsed.error.errors.map((e) => e.message).join("; "), "VALIDATION_ERROR");
  }
  const result = await runAction(() => softDeleteProductUseCase.execute(parsed.data));
  if (!result.success && result.code === "NOT_FOUND") {
    return err("Producto no encontrado", "NOT_FOUND");
  }
  return result;
}

export async function exportProducts(
  rawInput: unknown = {},
): Promise<ActionResult<ExportProductsCsvResultDTO>> {
  const parsed = exportProductsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(parsed.error.errors.map((e) => e.message).join("; "), "VALIDATION_ERROR");
  }
  return runAction(() => exportProductsCsvUseCase.execute(parsed.data));
}

/**
 * Dry-run validation of a parsed CSV: returns per-row verdicts (duplicate
 * SKU, missing name, unknown category…) without writing anything. Feeds the
 * import dialog's preview table.
 */
export async function previewProductsImport(
  rawInput: unknown,
): Promise<ActionResult<ImportProductsResultDTO>> {
  const parsed = importProductsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(parsed.error.errors.map((e) => e.message).join("; "), "VALIDATION_ERROR");
  }
  return runAction(() =>
    importProductsUseCase.execute({ rows: parsed.data.rows, dryRun: true }),
  );
}

/**
 * Commits the import: re-validates every row server-side, creates the valid
 * products (with their initial stock level) and skips the rest.
 */
export async function importProducts(
  rawInput: unknown,
): Promise<ActionResult<ImportProductsResultDTO>> {
  const parsed = importProductsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(parsed.error.errors.map((e) => e.message).join("; "), "VALIDATION_ERROR");
  }
  return runAction(() =>
    importProductsUseCase.execute({ rows: parsed.data.rows, dryRun: false }),
  );
}

export async function restoreProduct(
  rawInput: unknown,
): Promise<ActionResult<void>> {
  const parsed = restoreProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(parsed.error.errors.map((e) => e.message).join("; "), "VALIDATION_ERROR");
  }
  const result = await runAction(() => restoreProductUseCase.execute(parsed.data));
  if (!result.success && result.code === "NOT_FOUND") {
    return err("Producto no encontrado", "NOT_FOUND");
  }
  return result;
}

export async function hardDeleteProduct(
  rawInput: unknown,
): Promise<ActionResult<void>> {
  const parsed = hardDeleteProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(parsed.error.errors.map((e) => e.message).join("; "), "VALIDATION_ERROR");
  }
  const result = await runAction(() => hardDeleteProductUseCase.execute(parsed.data));
  if (!result.success && result.code === "NOT_FOUND") {
    return err("Producto no encontrado", "NOT_FOUND");
  }
  return result;
}

/**
 * Returns the number of products currently in the Papelera. Used by the
 * RootLayout to feed the Navbar's Papelera badge. Returns 0 if the use case
 * throws — the badge is a presentation nicety, not a hard requirement.
 */
export async function getDeletedProductCount(): Promise<number> {
  try {
    return await getDeletedProductCountUseCase.execute();
  } catch {
    return 0;
  }
}

export async function deleteProductsBulk(
  rawInput: unknown,
): Promise<ActionResult<DeleteProductsBulkResultDTO>> {
  const parsed = deleteProductsBulkSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(
      parsed.error.errors.map((e) => e.message).join("; "),
      "VALIDATION_ERROR",
    );
  }
  const result = await runAction(() =>
    deleteProductsBulkUseCase.execute(parsed.data),
  );
  if (!result.success && result.code === "NOT_FOUND") {
    return err(
      "Algunos productos no se encontraron y la operación fue cancelada.",
      "NOT_FOUND",
    );
  }
  return result;
}
