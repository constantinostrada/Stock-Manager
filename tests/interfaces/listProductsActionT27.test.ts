/**
 * T27 — AC: "La action listProducts parsea el param y lo pasa al repo antes
 * de paginar" + "Tests: action parsea sort correcto".
 *
 * Verifies the listProducts Server Action parses the raw `sort` string
 * (`"<field>:<direction>"`) into a typed `{field, direction}` and forwards
 * it to listProductsUseCase.execute, and that malformed sort strings are
 * rejected at the validation boundary.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const executeMock = vi.fn();

vi.mock("@infrastructure/container", () => ({
  listProductsUseCase: {
    execute: (...args: unknown[]) => executeMock(...args),
  },
  createProductUseCase: { execute: vi.fn() },
  getProductUseCase: { execute: vi.fn() },
  getProductBySkuUseCase: { execute: vi.fn() },
  getProductWithMovementsUseCase: { execute: vi.fn() },
  updateProductUseCase: { execute: vi.fn() },
  deleteProductUseCase: { execute: vi.fn() },
  softDeleteProductUseCase: { execute: vi.fn() },
  deleteProductsBulkUseCase: { execute: vi.fn() },
}));

import { listProducts } from "@interfaces/actions/productActions";

beforeEach(() => {
  executeMock.mockReset();
  executeMock.mockResolvedValue([]);
});

describe("listProducts Server Action — T27 sort param", () => {
  it("parses `sort: 'name:asc'` into { field: 'name', direction: 'asc' } and forwards to the use case", async () => {
    const r = await listProducts({ sort: "name:asc" });
    expect(r.success).toBe(true);
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: { field: "name", direction: "asc" },
      }),
    );
  });

  it("parses `sort: 'price:desc'` into { field: 'price', direction: 'desc' }", async () => {
    await listProducts({ sort: "price:desc" });
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: { field: "price", direction: "desc" },
      }),
    );
  });

  it("parses `sort: 'stock:asc'` into { field: 'stock', direction: 'asc' }", async () => {
    await listProducts({ sort: "stock:asc" });
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: { field: "stock", direction: "asc" },
      }),
    );
  });

  it("preserves sort alongside name + supplierId filters", async () => {
    await listProducts({
      name: "hub",
      supplierId: "sup-acme",
      sort: "price:desc",
    });
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "hub",
        supplierId: "sup-acme",
        sort: { field: "price", direction: "desc" },
      }),
    );
  });

  it("when no sort is given, use case is invoked without a sort property", async () => {
    await listProducts({});
    expect(executeMock).toHaveBeenCalledTimes(1);
    const callArg = executeMock.mock.calls[0]?.[0] ?? {};
    expect(callArg.sort).toBeUndefined();
  });

  it("rejects malformed sort strings at the validation boundary (unknown field)", async () => {
    const r = await listProducts({ sort: "color:asc" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("VALIDATION_ERROR");
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("rejects malformed sort strings at the validation boundary (unknown direction)", async () => {
    const r = await listProducts({ sort: "name:sideways" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("VALIDATION_ERROR");
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("rejects malformed sort strings at the validation boundary (no colon)", async () => {
    const r = await listProducts({ sort: "nameasc" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("VALIDATION_ERROR");
    expect(executeMock).not.toHaveBeenCalled();
  });
});
