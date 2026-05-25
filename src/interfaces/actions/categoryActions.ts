/**
 * Category Server Actions
 *
 * LAYER: interfaces
 */

"use server";

import {
  createCategoryUseCase,
  listCategoriesUseCase,
  deleteCategoryUseCase,
} from "@infrastructure/container";
import {
  createCategorySchema,
  deleteCategorySchema,
} from "@interfaces/validation/categorySchemas";
import { runAction, err, type ActionResult } from "@interfaces/actions/actionHelpers";
import type { CategoryDTO } from "@application/dtos/CategoryDTO";

export async function createCategory(
  rawInput: unknown,
): Promise<ActionResult<CategoryDTO>> {
  const parsed = createCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(parsed.error.errors.map((e) => e.message).join("; "), "VALIDATION_ERROR");
  }
  return runAction(() => createCategoryUseCase.execute(parsed.data));
}

export async function listCategories(): Promise<ActionResult<CategoryDTO[]>> {
  return runAction(() => listCategoriesUseCase.execute());
}

export async function deleteCategory(
  rawInput: unknown,
): Promise<ActionResult<void>> {
  const parsed = deleteCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(parsed.error.errors.map((e) => e.message).join("; "), "VALIDATION_ERROR");
  }
  return runAction(() => deleteCategoryUseCase.execute(parsed.data));
}
