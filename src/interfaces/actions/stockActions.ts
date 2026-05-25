/**
 * Stock Server Actions
 *
 * Next.js Server Actions for stock management operations.
 *
 * LAYER: interfaces
 */

"use server";

import {
  adjustStockUseCase,
  getStockLevelUseCase,
  listStockLevelsUseCase,
  listStockMovementsUseCase,
  getStockSummaryUseCase,
} from "@infrastructure/container";
import {
  adjustStockSchema,
  listStockMovementsSchema,
} from "@interfaces/validation/stockSchemas";
import { runAction, err, type ActionResult } from "@interfaces/actions/actionHelpers";
import type {
  StockLevelDTO,
  StockMovementDTO,
  StockSummaryDTO,
} from "@application/dtos/StockDTO";
import type { ListStockLevelsInputDTO } from "@application/use-cases/stock/ListStockLevelsUseCase";

export async function adjustStock(
  rawInput: unknown,
): Promise<ActionResult<StockLevelDTO>> {
  const parsed = adjustStockSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(parsed.error.errors.map((e) => e.message).join("; "), "VALIDATION_ERROR");
  }
  return runAction(() => adjustStockUseCase.execute(parsed.data));
}

export async function getStockLevel(
  productId: string,
): Promise<ActionResult<StockLevelDTO>> {
  return runAction(() => getStockLevelUseCase.execute({ productId }));
}

export async function listStockLevels(
  options: ListStockLevelsInputDTO = {},
): Promise<ActionResult<StockLevelDTO[]>> {
  return runAction(() => listStockLevelsUseCase.execute(options));
}

export async function listStockMovements(
  rawInput: unknown = {},
): Promise<ActionResult<StockMovementDTO[]>> {
  const parsed = listStockMovementsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(parsed.error.errors.map((e) => e.message).join("; "), "VALIDATION_ERROR");
  }
  return runAction(() => listStockMovementsUseCase.execute(parsed.data));
}

export async function getStockSummary(): Promise<ActionResult<StockSummaryDTO>> {
  return runAction(() => getStockSummaryUseCase.execute());
}
