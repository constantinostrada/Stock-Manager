/**
 * Tests the productActions.createProduct Server Action:
 *  - AC-1: returns code: VALIDATION_ERROR with fieldErrors when Zod fails (price <= 0, stock < 0).
 *  - AC-4: returns code: CONFLICT with fieldErrors.sku = 'El SKU ya existe.' when the use case
 *          throws ConflictException.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ConflictException } from "@application/exceptions/ApplicationException";

// Mock the container to swap the createProductUseCase.execute behaviour per test.
const executeMock = vi.fn();
vi.mock("@infrastructure/container", () => ({
  createProductUseCase: {
    execute: (...args: unknown[]) => executeMock(...args),
  },
  // The action helpers don't touch these, but the file imports the namespace.
  listProductsUseCase: { execute: vi.fn() },
  getProductUseCase: { execute: vi.fn() },
  updateProductUseCase: { execute: vi.fn() },
  deleteProductUseCase: { execute: vi.fn() },
}));

// Defer the import until AFTER vi.mock so the action picks up the mocked container.
import { createProduct } from "@interfaces/actions/productActions";

beforeEach(() => {
  executeMock.mockReset();
});

describe("createProduct Server Action (AC-1 + AC-4)", () => {
  it("returns VALIDATION_ERROR + price fieldError when price <= 0", async () => {
    const r = await createProduct({
      sku: "ABC-1",
      name: "Foo",
      price: 0,
      stockInicial: 0,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
      expect(r.fieldErrors?.price).toMatch(/mayor a 0/);
    }
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR + stockInicial fieldError when stock is negative", async () => {
    const r = await createProduct({
      sku: "ABC-1",
      name: "Foo",
      price: 10,
      stockInicial: -1,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
      expect(r.fieldErrors?.stockInicial).toMatch(/negativo/);
    }
  });

  it("returns CONFLICT + sku fieldError when the use case throws ConflictException (SKU exists)", async () => {
    executeMock.mockRejectedValueOnce(
      new ConflictException('A product with SKU "ABC-1" already exists.'),
    );
    const r = await createProduct({
      sku: "ABC-1",
      name: "Foo",
      price: 10,
      stockInicial: 0,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("CONFLICT");
      expect(r.fieldErrors?.sku).toBe("El SKU ya existe.");
    }
  });

  it("delegates a valid payload to the use case and returns success", async () => {
    executeMock.mockResolvedValueOnce({
      id: "p1",
      name: "Foo",
      description: null,
      sku: "ABC-1",
      price: 10,
      currency: "USD",
      categoryId: null,
      categoryName: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const r = await createProduct({
      sku: "ABC-1",
      name: "Foo",
      price: 10,
      stockInicial: 5,
    });

    expect(r.success).toBe(true);
    expect(executeMock).toHaveBeenCalledTimes(1);
    // Schema default fills currency='USD', stockInicial passes through.
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sku: "ABC-1",
        name: "Foo",
        price: 10,
        currency: "USD",
        stockInicial: 5,
      }),
    );
  });
});
