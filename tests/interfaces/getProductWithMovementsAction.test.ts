/**
 * T25 — getProductWithMovements Server Action.
 *
 * Verifies the action wraps the use case in an ActionResult: success → data
 * shape pass-through; NotFoundException → { success: false, code: "NOT_FOUND" }
 * (the [id] page maps that to Next's notFound()).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@infrastructure/container", () => ({
  getProductWithMovementsUseCase: { execute: vi.fn() },
  getProductBySkuUseCase: { execute: vi.fn() },
  createProductUseCase: { execute: vi.fn() },
  listProductsUseCase: { execute: vi.fn() },
  getProductUseCase: { execute: vi.fn() },
  updateProductUseCase: { execute: vi.fn() },
  deleteProductUseCase: { execute: vi.fn() },
  deleteProductsBulkUseCase: { execute: vi.fn() },
}));

import { getProductWithMovements } from "@interfaces/actions/productActions";
import { getProductWithMovementsUseCase } from "@infrastructure/container";
import { NotFoundException } from "@application/exceptions/ApplicationException";

describe("getProductWithMovements Server Action (T25)", () => {
  it("returns { success: true, data: { product, movements, total_movements } } on hit", async () => {
    const payload = {
      product: {
        id: "p1",
        sku: "MS-01",
        name: "Mouse",
        description: null,
        price: 100,
        currency: "USD",
        categoryId: null,
        categoryName: null,
        supplierId: "sup-1",
        supplierName: "ACME",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      stockLevel: null,
      movements: [],
      total_movements: 0,
      page: 1,
      limit: 10,
    };
    (
      getProductWithMovementsUseCase.execute as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(payload);

    const result = await getProductWithMovements("p1", 1, 10);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data.product.id).toBe("p1");
    expect(result.data.total_movements).toBe(0);
    expect(getProductWithMovementsUseCase.execute).toHaveBeenCalledWith({
      product_id: "p1",
      page: 1,
      limit: 10,
    });
  });

  it("returns { success: false, code: 'NOT_FOUND' } when the use case throws NotFoundException", async () => {
    (
      getProductWithMovementsUseCase.execute as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce(new NotFoundException("Product", "NOPE"));

    const result = await getProductWithMovements("NOPE");
    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected failure");
    expect(result.code).toBe("NOT_FOUND");
  });

  it("defaults page=1 and limit=10 when omitted", async () => {
    (
      getProductWithMovementsUseCase.execute as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      product: {} as never,
      stockLevel: null,
      movements: [],
      total_movements: 0,
      page: 1,
      limit: 10,
    });
    await getProductWithMovements("p1");
    expect(getProductWithMovementsUseCase.execute).toHaveBeenCalledWith({
      product_id: "p1",
      page: 1,
      limit: 10,
    });
  });
});
