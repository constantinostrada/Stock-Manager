/**
 * T15 — AC-4: deleteProductsBulk Server Action validates input, delegates to
 * the use case, and maps NotFoundException to a Spanish rollback error.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotFoundException } from "@application/exceptions/ApplicationException";

const executeMock = vi.fn();
vi.mock("@infrastructure/container", () => ({
  deleteProductsBulkUseCase: {
    execute: (...args: unknown[]) => executeMock(...args),
  },
  deleteProductUseCase: { execute: vi.fn() },
  updateProductUseCase: { execute: vi.fn() },
  createProductUseCase: { execute: vi.fn() },
  listProductsUseCase: { execute: vi.fn() },
  getProductUseCase: { execute: vi.fn() },
  getProductBySkuUseCase: { execute: vi.fn() },
}));

import { deleteProductsBulk } from "@interfaces/actions/productActions";

beforeEach(() => {
  executeMock.mockReset();
});

describe("deleteProductsBulk Server Action (T15 AC-4)", () => {
  it("returns VALIDATION_ERROR when skus is missing", async () => {
    const r = await deleteProductsBulk({});
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("VALIDATION_ERROR");
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when skus is empty", async () => {
    const r = await deleteProductsBulk({ skus: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("VALIDATION_ERROR");
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when an entry is an empty string", async () => {
    const r = await deleteProductsBulk({ skus: ["A", ""] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("VALIDATION_ERROR");
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("maps NotFoundException to Spanish rollback error", async () => {
    executeMock.mockRejectedValueOnce(
      new NotFoundException("Product", "A,B"),
    );
    const r = await deleteProductsBulk({ skus: ["A", "B"] });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("NOT_FOUND");
      expect(r.error).toBe(
        "Algunos productos no se encontraron y la operación fue cancelada.",
      );
    }
  });

  it("delegates a valid payload to the use case and returns deletedCount", async () => {
    executeMock.mockResolvedValueOnce({ deletedCount: 2 });
    const r = await deleteProductsBulk({ skus: ["A", "B"] });
    expect(r.success).toBe(true);
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledWith({ skus: ["A", "B"] });
    if (r.success) expect(r.data).toEqual({ deletedCount: 2 });
  });
});
