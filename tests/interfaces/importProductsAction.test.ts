/**
 * T29 — importProducts Server Action validation.
 *
 * The action lives behind a Zod schema; this test verifies schema rejection
 * (the use case itself is covered separately in tests/application/).
 */
import { describe, expect, it, vi } from "vitest";

const { executeMock } = vi.hoisted(() => ({ executeMock: vi.fn() }));

vi.mock("@infrastructure/container", () => ({
  createProductUseCase: { execute: vi.fn() },
  listProductsUseCase: { execute: vi.fn() },
  getProductUseCase: { execute: vi.fn() },
  getProductBySkuUseCase: { execute: vi.fn() },
  getProductWithMovementsUseCase: { execute: vi.fn() },
  updateProductUseCase: { execute: vi.fn() },
  softDeleteProductUseCase: { execute: vi.fn() },
  deleteProductsBulkUseCase: { execute: vi.fn() },
  exportProductsCsvUseCase: { execute: vi.fn() },
  importProductsCsvUseCase: { execute: executeMock },
}));

import { importProducts } from "@interfaces/actions/productActions";

describe("importProducts action — T29", () => {
  it("rejects an empty csvText with a VALIDATION_ERROR", async () => {
    const result = await importProducts({ csvText: "", mode: "dry-run" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("VALIDATION_ERROR");
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid mode", async () => {
    const result = await importProducts({ csvText: "header\nrow", mode: "wrong" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("VALIDATION_ERROR");
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("delegates to the use case on valid input and wraps the result", async () => {
    executeMock.mockResolvedValueOnce({
      mode: "dry-run",
      fileError: null,
      valid: [],
      invalid: [],
      summary: {
        totalRows: 0,
        validCount: 0,
        invalidCount: 0,
        createdCount: 0,
        updatedCount: 0,
        movementsLogged: 0,
      },
    });

    const result = await importProducts({
      csvText: "sku,name,description,price,categoryName,supplierName,quantity,minQuantity",
      mode: "dry-run",
    });

    expect(result.success).toBe(true);
    expect(executeMock).toHaveBeenCalledTimes(1);
  });
});
