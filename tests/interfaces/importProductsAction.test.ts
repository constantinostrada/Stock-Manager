/**
 * CSV import — `previewProductsImport` / `importProducts` Server Actions
 *
 *  • Validate the rows payload structurally (non-empty, ≤1000 rows).
 *  • previewProductsImport forwards rows with dryRun: true.
 *  • importProducts forwards rows with dryRun: false.
 *  • Both return the use case result as ActionResult.data.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const executeMock = vi.fn();

vi.mock("@infrastructure/container", () => ({
  importProductsUseCase: {
    execute: (...args: unknown[]) => executeMock(...args),
  },
  exportProductsCsvUseCase: { execute: vi.fn() },
  createProductUseCase: { execute: vi.fn() },
  listProductsUseCase: { execute: vi.fn() },
  getProductUseCase: { execute: vi.fn() },
  getProductBySkuUseCase: { execute: vi.fn() },
  getProductWithMovementsUseCase: { execute: vi.fn() },
  updateProductUseCase: { execute: vi.fn() },
  softDeleteProductUseCase: { execute: vi.fn() },
  deleteProductsBulkUseCase: { execute: vi.fn() },
}));

import {
  previewProductsImport,
  importProducts,
} from "@interfaces/actions/productActions";

const ROW = {
  rowNumber: 2,
  name: "Mouse",
  sku: "MOU-001",
  price: "25.50",
  categoryName: "",
  supplierName: "",
  stock: "",
  minStock: "",
};

const USE_CASE_RESULT = {
  rows: [{ ...ROW, valid: true, errors: [] }],
  validCount: 1,
  errorCount: 0,
  createdCount: 0,
};

beforeEach(() => {
  executeMock.mockReset();
  executeMock.mockResolvedValue(USE_CASE_RESULT);
});

describe("previewProductsImport Server Action", () => {
  it("forwards rows to the use case with dryRun: true", async () => {
    const r = await previewProductsImport({ rows: [ROW] });
    expect(r).toEqual({ success: true, data: USE_CASE_RESULT });
    expect(executeMock).toHaveBeenCalledWith({ rows: [ROW], dryRun: true });
  });

  it("rejects an empty rows array at the validation boundary", async () => {
    const r = await previewProductsImport({ rows: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("VALIDATION_ERROR");
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("rejects more than 1000 rows", async () => {
    const rows = Array.from({ length: 1001 }, (_, i) => ({
      ...ROW,
      rowNumber: i + 2,
    }));
    const r = await previewProductsImport({ rows });
    expect(r.success).toBe(false);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("rejects structurally malformed rows", async () => {
    const r = await previewProductsImport({
      rows: [{ rowNumber: 2, name: "X" }], // missing sku/price
    });
    expect(r.success).toBe(false);
    expect(executeMock).not.toHaveBeenCalled();
  });
});

describe("importProducts Server Action", () => {
  it("forwards rows to the use case with dryRun: false", async () => {
    executeMock.mockResolvedValueOnce({
      ...USE_CASE_RESULT,
      createdCount: 1,
    });
    const r = await importProducts({ rows: [ROW] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.createdCount).toBe(1);
    expect(executeMock).toHaveBeenCalledWith({ rows: [ROW], dryRun: false });
  });

  it("rejects an empty rows array at the validation boundary", async () => {
    const r = await importProducts({ rows: [] });
    expect(r.success).toBe(false);
    expect(executeMock).not.toHaveBeenCalled();
  });
});
