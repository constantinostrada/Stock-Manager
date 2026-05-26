/**
 * T8 — AC-2: getProductBySku Server Action shape.
 *
 * Verifies that the action wraps the use case and returns an ActionResult
 * with { product, stockLevel, movements } on success and `code: "NOT_FOUND"`
 * when the SKU is missing (the page maps that to Next's notFound()).
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@infrastructure/container", () => ({
  getProductBySkuUseCase: {
    execute: vi.fn(),
  },
  createProductUseCase: { execute: vi.fn() },
  listProductsUseCase: { execute: vi.fn() },
  getProductUseCase: { execute: vi.fn() },
  updateProductUseCase: { execute: vi.fn() },
  deleteProductUseCase: { execute: vi.fn() },
}));

import { getProductBySku } from "@interfaces/actions/productActions";
import { getProductBySkuUseCase } from "@infrastructure/container";
import { NotFoundException } from "@application/exceptions/ApplicationException";

describe("getProductBySku Server Action (T8 AC-2)", () => {
  it("returns { success: true, data: { product, stockLevel, movements } } on hit", async () => {
    const fakeProduct = {
      id: "p1",
      sku: "MS-01",
      name: "Mouse",
      description: null,
      price: 100,
      currency: "USD",
      categoryId: null,
      categoryName: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    (getProductBySkuUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      product: fakeProduct,
      stockLevel: null,
      movements: [],
    });

    const result = await getProductBySku("MS-01");
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data.product.sku).toBe("MS-01");
    expect(result.data.movements).toEqual([]);
    expect(getProductBySkuUseCase.execute).toHaveBeenCalledWith({ sku: "MS-01" });
  });

  it("returns { success: false, code: 'NOT_FOUND' } when the use case throws NotFoundException", async () => {
    (getProductBySkuUseCase.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new NotFoundException("Product with sku", "NOPE"),
    );

    const result = await getProductBySku("NOPE");
    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected failure");
    expect(result.code).toBe("NOT_FOUND");
  });
});
