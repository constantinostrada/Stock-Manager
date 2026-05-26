/**
 * Movement Server Actions
 *
 * Next.js Server Actions for stock movements.
 * Thin controllers: validate input → map Spanish DTO → call use case → return ActionResult.
 *
 * LAYER: interfaces
 */

"use server";

import { adjustStockUseCase } from "@infrastructure/container";
import {
  registerMovementSchema,
  createMovementSchema,
} from "@interfaces/validation/movementSchemas";
import { runAction, err, type ActionResult } from "@interfaces/actions/actionHelpers";
import type { StockLevelDTO } from "@application/dtos/StockDTO";

const TIPO_TO_TYPE = { ENTRADA: "IN", SALIDA: "OUT" } as const;

const CREATE_TIPO_TO_TYPE = {
  ENTRADA: "IN",
  SALIDA: "OUT",
  AJUSTE: "ADJUSTMENT",
} as const;

/**
 * Registers a stock movement transactionally.
 * Insufficient stock on SALIDA → ActionResult error with Spanish message
 * and `fieldErrors.cantidad` so the dialog can surface it inline.
 */
export async function registerMovement(
  rawInput: unknown,
): Promise<ActionResult<StockLevelDTO>> {
  const parsed = registerMovementSchema.safeParse(rawInput);
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

  const { productId, tipo, cantidad, razon } = parsed.data;
  const result = await runAction(() =>
    adjustStockUseCase.execute({
      productId,
      type: TIPO_TO_TYPE[tipo],
      quantity: cantidad,
      reason: razon,
    }),
  );

  // Domain-level insufficient stock surfaces as DOMAIN_ERROR with the English
  // message from StockLevel.removeStock. Map to a Spanish descriptive error
  // and a field-level error on `cantidad` so the dialog can render it inline.
  if (!result.success && result.code === "DOMAIN_ERROR") {
    const insufficient = /Insufficient stock\. Requested (\d+), available (\d+)/i.exec(
      result.error,
    );
    if (insufficient) {
      const requested = insufficient[1];
      const available = insufficient[2];
      const message = `Stock insuficiente: la cantidad solicitada (${requested}) supera el stock actual (${available}).`;
      return err(message, "DOMAIN_ERROR", { cantidad: message });
    }
  }

  return result;
}

/**
 * T14 — Creates a stock movement from the global "+ Nuevo movimiento" dialog.
 *
 * Accepts ENTRADA / SALIDA / AJUSTE; razon is optional. The user picks the
 * product from a select, so NotFoundException(Product) must surface as a
 * fieldErrors.productId entry the dialog can render inline (AC-4).
 *
 * Transactional guarantee: delegates to adjustStockUseCase, which calls
 * IStockRepository.applyMovement — a single prisma.$transaction that commits
 * the StockMovement audit row + the new StockLevel atomically (AC-6).
 */
export async function createMovement(
  rawInput: unknown,
): Promise<ActionResult<StockLevelDTO>> {
  const parsed = createMovementSchema.safeParse(rawInput);
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

  const { productId, tipo, cantidad, razon } = parsed.data;
  const result = await runAction(() =>
    adjustStockUseCase.execute({
      productId,
      type: CREATE_TIPO_TO_TYPE[tipo],
      quantity: cantidad,
      reason: razon,
    }),
  );

  if (result.success) return result;

  // NotFoundException("Product", id) — user picked a productId that no longer
  // exists. Surface as fieldErrors.productId so the select highlights the issue.
  if (result.code === "NOT_FOUND" && /Product with id/i.test(result.error)) {
    const message = "Producto no existe.";
    return err(message, "NOT_FOUND", { productId: message });
  }

  // DomainException "Insufficient stock. Requested N, available M" → AC-4
  // Spanish wording with "para esta salida" + fieldErrors.cantidad.
  if (result.code === "DOMAIN_ERROR") {
    const insufficient = /Insufficient stock\. Requested (\d+), available (\d+)/i.exec(
      result.error,
    );
    if (insufficient) {
      const requested = insufficient[1];
      const available = insufficient[2];
      const message = `Stock insuficiente para esta salida (solicitado ${requested}, disponible ${available}).`;
      return err(message, "DOMAIN_ERROR", { cantidad: message });
    }
  }

  return result;
}
