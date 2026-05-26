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
import { registerMovementSchema } from "@interfaces/validation/movementSchemas";
import { runAction, err, type ActionResult } from "@interfaces/actions/actionHelpers";
import type { StockLevelDTO } from "@application/dtos/StockDTO";

const TIPO_TO_TYPE = { ENTRADA: "IN", SALIDA: "OUT" } as const;

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
