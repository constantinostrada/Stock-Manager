/**
 * T30 — hardDeleteProduct Server Action delegates to HardDeleteProductUseCase,
 * validates id with Zod, and maps NotFoundException to a Spanish
 * "Producto no encontrado" message.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotFoundException } from "@application/exceptions/ApplicationException";

const hardDeleteMock = vi.fn();
vi.mock("@infrastructure/container", () => ({
  hardDeleteProductUseCase: {
    execute: (...args: unknown[]) => hardDeleteMock(...args),
  },
  restoreProductUseCase: { execute: vi.fn() },
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

import { hardDeleteProduct } from "@interfaces/actions/productActions";

beforeEach(() => {
  hardDeleteMock.mockReset();
});

describe("hardDeleteProduct Server Action (T30)", () => {
  it("returns VALIDATION_ERROR when id is missing", async () => {
    const r = await hardDeleteProduct({});
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("VALIDATION_ERROR");
    expect(hardDeleteMock).not.toHaveBeenCalled();
  });

  it("returns Producto no encontrado when the use case throws NotFoundException", async () => {
    hardDeleteMock.mockRejectedValueOnce(new NotFoundException("Product", "missing"));
    const r = await hardDeleteProduct({ id: "missing" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("NOT_FOUND");
      expect(r.error).toBe("Producto no encontrado");
    }
  });

  it("delegates a valid payload to hardDeleteProductUseCase and returns success", async () => {
    hardDeleteMock.mockResolvedValueOnce(undefined);
    const r = await hardDeleteProduct({ id: "p-1" });
    expect(r.success).toBe(true);
    expect(hardDeleteMock).toHaveBeenCalledTimes(1);
    expect(hardDeleteMock).toHaveBeenCalledWith({ id: "p-1" });
  });
});
