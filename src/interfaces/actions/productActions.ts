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
  updateProductUseCase,
  deleteProductUseCase,
} from "@infrastructure/container";
import {
  createProductSchema,
  updateProductSchema,
  deleteProductSchema,
  listProductsSchema,
} from "@interfaces/validation/productSchemas";
import { runAction, err, type ActionResult } from "@interfaces/actions/actionHelpers";
import type { ProductDTO } from "@application/dtos/ProductDTO";

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

export async function updateProduct(
  rawInput: unknown,
): Promise<ActionResult<ProductDTO>> {
  const parsed = updateProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(parsed.error.errors.map((e) => e.message).join("; "), "VALIDATION_ERROR");
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
  return runAction(() => deleteProductUseCase.execute(parsed.data));
}
