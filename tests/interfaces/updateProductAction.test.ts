/**
 * T7 — AC-1: updateProduct Server Action returns VALIDATION_ERROR + fieldErrors
 * when Zod fails, NOT_FOUND when the use case throws NotFoundException, and
 * success otherwise.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotFoundException } from "@application/exceptions/ApplicationException";

const executeMock = vi.fn();
vi.mock("@infrastructure/container", () => ({
  updateProductUseCase: {
    execute: (...args: unknown[]) => executeMock(...args),
  },
  createProductUseCase: { execute: vi.fn() },
  listProductsUseCase: { execute: vi.fn() },
  getProductUseCase: { execute: vi.fn() },
  deleteProductUseCase: { execute: vi.fn() },
}));

import { updateProduct } from "@interfaces/actions/productActions";

beforeEach(() => {
  executeMock.mockReset();
});

describe("updateProduct Server Action (T7 AC-1)", () => {
  it("returns VALIDATION_ERROR + price fieldError when price <= 0", async () => {
    const r = await updateProduct({
      id: "p-1",
      name: "Foo",
      price: 0,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
      expect(r.fieldErrors?.price).toMatch(/mayor a 0/);
    }
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR + name fieldError when name is empty", async () => {
    const r = await updateProduct({
      id: "p-1",
      name: "",
      price: 10,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
      expect(r.fieldErrors?.name).toMatch(/requerido/);
    }
  });

  it("returns VALIDATION_ERROR when id is missing", async () => {
    const r = await updateProduct({
      name: "Foo",
      price: 10,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns NOT_FOUND when the use case throws NotFoundException", async () => {
    executeMock.mockRejectedValueOnce(
      new NotFoundException("Product", "missing-id"),
    );
    const r = await updateProduct({
      id: "missing-id",
      name: "Foo",
      price: 10,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("NOT_FOUND");
    }
  });

  it("delegates a valid payload to the use case and returns success", async () => {
    executeMock.mockResolvedValueOnce({
      id: "p-1",
      name: "Foo updated",
      description: null,
      sku: "ABC-1",
      price: 99,
      currency: "USD",
      categoryId: "cat-1",
      categoryName: "Electrónica",
      supplierId: null,
      supplierName: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const r = await updateProduct({
      id: "p-1",
      name: "Foo updated",
      price: 99,
      categoryId: "cat-1",
    });

    expect(r.success).toBe(true);
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "p-1",
        name: "Foo updated",
        price: 99,
        currency: "USD",
        categoryId: "cat-1",
      }),
    );
  });

  it("T18: passes the optional supplierId through to the use case", async () => {
    executeMock.mockResolvedValueOnce({
      id: "p-1",
      name: "Foo",
      description: null,
      sku: "ABC-1",
      price: 99,
      currency: "USD",
      categoryId: null,
      categoryName: null,
      supplierId: "sup-acme",
      supplierName: "Acme",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const r = await updateProduct({
      id: "p-1",
      name: "Foo",
      price: 99,
      supplierId: "sup-acme",
    });

    expect(r.success).toBe(true);
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ supplierId: "sup-acme" }),
    );
  });
});
