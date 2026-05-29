/**
 * T10 — AC-1: deleteProduct Server Action delegates to the use case, validates
 * id with Zod, and surfaces a Spanish "Producto no encontrado" message when
 * the use case throws NotFoundException.
 *
 * T26: rewired from `deleteProductUseCase` (hard delete) to
 * `softDeleteProductUseCase`. The external contract (validation + Spanish
 * not-found mapping) is unchanged.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotFoundException } from "@application/exceptions/ApplicationException";

const executeMock = vi.fn();
vi.mock("@infrastructure/container", () => ({
  softDeleteProductUseCase: {
    execute: (...args: unknown[]) => executeMock(...args),
  },
  deleteProductUseCase: { execute: vi.fn() },
  updateProductUseCase: { execute: vi.fn() },
  createProductUseCase: { execute: vi.fn() },
  listProductsUseCase: { execute: vi.fn() },
  getProductUseCase: { execute: vi.fn() },
  getProductBySkuUseCase: { execute: vi.fn() },
}));

import { deleteProduct } from "@interfaces/actions/productActions";

beforeEach(() => {
  executeMock.mockReset();
});

describe("deleteProduct Server Action (T10 AC-1 + T26 rewire to soft delete)", () => {
  it("returns VALIDATION_ERROR when id is missing", async () => {
    const r = await deleteProduct({});
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
    }
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when id is empty", async () => {
    const r = await deleteProduct({ id: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
    }
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns { error: 'Producto no encontrado' } when the use case throws NotFoundException", async () => {
    executeMock.mockRejectedValueOnce(
      new NotFoundException("Product", "missing-id"),
    );
    const r = await deleteProduct({ id: "missing-id" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("NOT_FOUND");
      expect(r.error).toBe("Producto no encontrado");
    }
  });

  it("delegates a valid payload to deleteProductUseCase and returns success", async () => {
    executeMock.mockResolvedValueOnce(undefined);

    const r = await deleteProduct({ id: "p-1" });

    expect(r.success).toBe(true);
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledWith({ id: "p-1" });
  });
});
