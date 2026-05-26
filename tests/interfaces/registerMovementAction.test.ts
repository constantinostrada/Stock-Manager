/**
 * Tests the movementActions.registerMovement Server Action.
 *
 * AC-1: Server Action registerMovement(productId, tipo, cantidad, razon)
 *       — SALIDA con cantidad > stock_actual → error descriptivo.
 *       — transaccional: delegates to adjustStockUseCase, which uses the
 *         repository's atomic applyMovement (covered by a dedicated test).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "@domain/exceptions/DomainException";

const executeMock = vi.fn();
vi.mock("@infrastructure/container", () => ({
  adjustStockUseCase: {
    execute: (...args: unknown[]) => executeMock(...args),
  },
}));

import { registerMovement } from "@interfaces/actions/movementActions";

beforeEach(() => {
  executeMock.mockReset();
});

describe("registerMovement Server Action (AC-1)", () => {
  it("rejects cantidad <= 0 with VALIDATION_ERROR + fieldErrors.cantidad", async () => {
    const r = await registerMovement({
      productId: "p1",
      tipo: "ENTRADA",
      cantidad: 0,
      razon: "Compra",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
      expect(r.fieldErrors?.cantidad).toMatch(/mayor que cero/);
    }
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("rejects empty razon with VALIDATION_ERROR + fieldErrors.razon", async () => {
    const r = await registerMovement({
      productId: "p1",
      tipo: "ENTRADA",
      cantidad: 3,
      razon: "   ",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
      expect(r.fieldErrors?.razon).toMatch(/obligatoria/);
    }
  });

  it("rejects unknown tipo with VALIDATION_ERROR", async () => {
    const r = await registerMovement({
      productId: "p1",
      tipo: "OTRO",
      cantidad: 3,
      razon: "Compra",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
    }
  });

  it("maps tipo ENTRADA → type IN before delegating to the use case", async () => {
    executeMock.mockResolvedValueOnce({
      id: "sl1",
      productId: "p1",
      productName: "X",
      productSku: "SK1",
      quantity: 8,
      minQuantity: 0,
      isLowStock: false,
      isOutOfStock: false,
      updatedAt: new Date().toISOString(),
    });
    const r = await registerMovement({
      productId: "p1",
      tipo: "ENTRADA",
      cantidad: 3,
      razon: "Compra",
    });
    expect(r.success).toBe(true);
    expect(executeMock).toHaveBeenCalledWith({
      productId: "p1",
      type: "IN",
      quantity: 3,
      reason: "Compra",
    });
  });

  it("maps tipo SALIDA → type OUT before delegating to the use case", async () => {
    executeMock.mockResolvedValueOnce({
      id: "sl1",
      productId: "p1",
      productName: "X",
      productSku: "SK1",
      quantity: 2,
      minQuantity: 0,
      isLowStock: false,
      isOutOfStock: false,
      updatedAt: new Date().toISOString(),
    });
    const r = await registerMovement({
      productId: "p1",
      tipo: "SALIDA",
      cantidad: 3,
      razon: "Venta",
    });
    expect(r.success).toBe(true);
    expect(executeMock).toHaveBeenCalledWith({
      productId: "p1",
      type: "OUT",
      quantity: 3,
      reason: "Venta",
    });
  });

  it("AC-1: SALIDA with cantidad > stock_actual → DOMAIN_ERROR with descriptive Spanish error + fieldErrors.cantidad", async () => {
    // The use case bubbles a DomainException from StockLevel.removeStock when
    // requested > available. The action must surface this as a Spanish message
    // attached to the cantidad field.
    executeMock.mockRejectedValueOnce(
      new DomainException("Insufficient stock. Requested 10, available 3."),
    );

    const r = await registerMovement({
      productId: "p1",
      tipo: "SALIDA",
      cantidad: 10,
      razon: "Venta",
    });

    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("DOMAIN_ERROR");
      expect(r.error).toMatch(/Stock insuficiente/);
      expect(r.error).toMatch(/10/);
      expect(r.error).toMatch(/3/);
      expect(r.fieldErrors?.cantidad).toMatch(/Stock insuficiente/);
    }
  });
});
