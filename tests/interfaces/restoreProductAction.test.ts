/**
 * T30 — restoreProduct Server Action delegates to RestoreProductUseCase,
 * validates id with Zod, and maps NotFoundException to a Spanish
 * "Producto no encontrado" message.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotFoundException } from "@application/exceptions/ApplicationException";

const restoreMock = vi.fn();
vi.mock("@infrastructure/container", () => ({
  restoreProductUseCase: {
    execute: (...args: unknown[]) => restoreMock(...args),
  },
  hardDeleteProductUseCase: { execute: vi.fn() },
  getDeletedProductCountUseCase: { execute: vi.fn() },
  softDeleteProductUseCase: { execute: vi.fn() },
  deleteProductUseCase: { execute: vi.fn() },
  updateProductUseCase: { execute: vi.fn() },
  createProductUseCase: { execute: vi.fn() },
  listProductsUseCase: { execute: vi.fn() },
  getProductUseCase: { execute: vi.fn() },
  getProductBySkuUseCase: { execute: vi.fn() },
  getProductWithMovementsUseCase: { execute: vi.fn() },
  exportProductsCsvUseCase: { execute: vi.fn() },
  deleteProductsBulkUseCase: { execute: vi.fn() },
}));

import { restoreProduct } from "@interfaces/actions/productActions";

beforeEach(() => {
  restoreMock.mockReset();
});

describe("restoreProduct Server Action (T30)", () => {
  it("returns VALIDATION_ERROR when id is missing", async () => {
    const r = await restoreProduct({});
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("VALIDATION_ERROR");
    expect(restoreMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when id is empty", async () => {
    const r = await restoreProduct({ id: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("VALIDATION_ERROR");
    expect(restoreMock).not.toHaveBeenCalled();
  });

  it("returns Producto no encontrado when the use case throws NotFoundException", async () => {
    restoreMock.mockRejectedValueOnce(new NotFoundException("Product", "missing"));
    const r = await restoreProduct({ id: "missing" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("NOT_FOUND");
      expect(r.error).toBe("Producto no encontrado");
    }
  });

  it("delegates a valid payload to restoreProductUseCase and returns success", async () => {
    restoreMock.mockResolvedValueOnce(undefined);
    const r = await restoreProduct({ id: "p-1" });
    expect(r.success).toBe(true);
    expect(restoreMock).toHaveBeenCalledTimes(1);
    expect(restoreMock).toHaveBeenCalledWith({ id: "p-1" });
  });
});
