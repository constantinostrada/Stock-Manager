/**
 * Tests the movementActions.createMovement Server Action (T14).
 *
 * AC-1: validated with Zod (cantidad > 0, producto debe existir, stock
 *       resultante no puede ser negativo en SALIDA).
 * AC-4: errors are surfaced inline (fieldErrors.productId / fieldErrors.cantidad)
 *       with the Spanish wording the dialog renders verbatim.
 * AC-6: createMovement registra el Movement y actualiza Product.stock en la
 *       misma transacción — this action delegates to adjustStockUseCase, whose
 *       transactional contract is covered by tests/application/adjustStockUseCase.test.ts.
 *       Here we assert the action DOES delegate (no other write path).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "@domain/exceptions/DomainException";
import { NotFoundException } from "@application/exceptions/ApplicationException";

const executeMock = vi.fn();
vi.mock("@infrastructure/container", () => ({
  adjustStockUseCase: {
    execute: (...args: unknown[]) => executeMock(...args),
  },
}));

import { createMovement } from "@interfaces/actions/movementActions";

function okResult(quantity = 8) {
  return {
    id: "sl1",
    productId: "p1",
    productName: "Mouse",
    productSku: "MS-01",
    quantity,
    minQuantity: 0,
    isLowStock: false,
    isOutOfStock: false,
    updatedAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  executeMock.mockReset();
});

describe("createMovement Server Action (T14)", () => {
  it("AC-1: rejects cantidad <= 0 with VALIDATION_ERROR + fieldErrors.cantidad", async () => {
    const r = await createMovement({
      productId: "p1",
      tipo: "ENTRADA",
      cantidad: 0,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
      expect(r.fieldErrors?.cantidad).toMatch(/mayor que cero/);
    }
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("AC-1: rejects non-integer cantidad with VALIDATION_ERROR", async () => {
    const r = await createMovement({
      productId: "p1",
      tipo: "ENTRADA",
      cantidad: 3.5,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
      expect(r.fieldErrors?.cantidad).toMatch(/entero/);
    }
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("AC-3: accepts AJUSTE and maps tipo→type ADJUSTMENT before delegating", async () => {
    executeMock.mockResolvedValueOnce(okResult(15));
    const r = await createMovement({
      productId: "p1",
      tipo: "AJUSTE",
      cantidad: 15,
    });
    expect(r.success).toBe(true);
    expect(executeMock).toHaveBeenCalledWith({
      productId: "p1",
      type: "ADJUSTMENT",
      quantity: 15,
      reason: undefined,
    });
  });

  it("AC-3: maps tipo ENTRADA → IN and SALIDA → OUT", async () => {
    executeMock.mockResolvedValueOnce(okResult(10));
    await createMovement({
      productId: "p1",
      tipo: "ENTRADA",
      cantidad: 3,
    });
    expect(executeMock).toHaveBeenLastCalledWith({
      productId: "p1",
      type: "IN",
      quantity: 3,
      reason: undefined,
    });

    executeMock.mockResolvedValueOnce(okResult(7));
    await createMovement({
      productId: "p1",
      tipo: "SALIDA",
      cantidad: 3,
    });
    expect(executeMock).toHaveBeenLastCalledWith({
      productId: "p1",
      type: "OUT",
      quantity: 3,
      reason: undefined,
    });
  });

  it("AC-3: razon is optional — empty/whitespace string is accepted and passed as undefined", async () => {
    executeMock.mockResolvedValueOnce(okResult(8));
    const r = await createMovement({
      productId: "p1",
      tipo: "ENTRADA",
      cantidad: 3,
      razon: "   ",
    });
    expect(r.success).toBe(true);
    expect(executeMock).toHaveBeenCalledWith({
      productId: "p1",
      type: "IN",
      quantity: 3,
      reason: undefined,
    });
  });

  it("AC-3: razon when provided is trimmed and forwarded", async () => {
    executeMock.mockResolvedValueOnce(okResult(8));
    await createMovement({
      productId: "p1",
      tipo: "ENTRADA",
      cantidad: 3,
      razon: "  Compra mayorista  ",
    });
    expect(executeMock).toHaveBeenLastCalledWith({
      productId: "p1",
      type: "IN",
      quantity: 3,
      reason: "Compra mayorista",
    });
  });

  it("AC-1+AC-4: producto debe existir — NotFoundException maps to fieldErrors.productId 'Producto no existe.'", async () => {
    executeMock.mockRejectedValueOnce(
      new NotFoundException("Product", "p-missing"),
    );
    const r = await createMovement({
      productId: "p-missing",
      tipo: "ENTRADA",
      cantidad: 3,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("NOT_FOUND");
      expect(r.fieldErrors?.productId).toBe("Producto no existe.");
      expect(r.error).toBe("Producto no existe.");
    }
  });

  it("AC-1+AC-4: SALIDA con cantidad > stock_actual → DOMAIN_ERROR + fieldErrors.cantidad with 'Stock insuficiente para esta salida' wording", async () => {
    executeMock.mockRejectedValueOnce(
      new DomainException("Insufficient stock. Requested 10, available 3."),
    );
    const r = await createMovement({
      productId: "p1",
      tipo: "SALIDA",
      cantidad: 10,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("DOMAIN_ERROR");
      expect(r.error).toMatch(/Stock insuficiente para esta salida/);
      expect(r.error).toMatch(/10/);
      expect(r.error).toMatch(/3/);
      expect(r.fieldErrors?.cantidad).toMatch(/Stock insuficiente para esta salida/);
    }
  });

  it("AC-6: delegates to adjustStockUseCase (the transactional layer) exactly once on a valid input", async () => {
    executeMock.mockResolvedValueOnce(okResult(8));
    await createMovement({
      productId: "p1",
      tipo: "ENTRADA",
      cantidad: 5,
      razon: "Compra",
    });
    // The transactional applyMovement contract is enforced inside the use case
    // (covered by tests/application/adjustStockUseCase.test.ts). Here we just
    // confirm createMovement is NOT taking a second non-transactional path.
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledWith({
      productId: "p1",
      type: "IN",
      quantity: 5,
      reason: "Compra",
    });
  });

  it("AC-1: rejects empty productId with VALIDATION_ERROR + fieldErrors.productId", async () => {
    const r = await createMovement({
      productId: "",
      tipo: "ENTRADA",
      cantidad: 3,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
      expect(r.fieldErrors?.productId).toMatch(/obligatorio/);
    }
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("AC-1: rejects unknown tipo with VALIDATION_ERROR", async () => {
    const r = await createMovement({
      productId: "p1",
      tipo: "OTRO",
      cantidad: 3,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
      expect(r.fieldErrors?.tipo).toMatch(/ENTRADA, SALIDA o AJUSTE/);
    }
    expect(executeMock).not.toHaveBeenCalled();
  });
});
