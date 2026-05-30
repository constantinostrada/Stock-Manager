/**
 * T28 — `exportProducts` Server Action
 *
 *  • Parses q (`name`) and sort, forwards them to the use case.
 *  • Ignores page/limit if they happen to be in the input.
 *  • Returns ActionResult<{filename, content}> on success.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const executeMock = vi.fn();

vi.mock("@infrastructure/container", () => ({
  exportProductsCsvUseCase: {
    execute: (...args: unknown[]) => executeMock(...args),
  },
  createProductUseCase: { execute: vi.fn() },
  listProductsUseCase: { execute: vi.fn() },
  getProductUseCase: { execute: vi.fn() },
  getProductBySkuUseCase: { execute: vi.fn() },
  getProductWithMovementsUseCase: { execute: vi.fn() },
  updateProductUseCase: { execute: vi.fn() },
  softDeleteProductUseCase: { execute: vi.fn() },
  deleteProductsBulkUseCase: { execute: vi.fn() },
}));

import { exportProducts } from "@interfaces/actions/productActions";

beforeEach(() => {
  executeMock.mockReset();
  executeMock.mockResolvedValue({
    filename: "products-2026-05-26-0807.csv",
    content: "﻿Nombre,Precio,Stock,Proveedor,Creado\r\n",
  });
});

describe("exportProducts Server Action — T28", () => {
  it("with no input, calls the use case with an empty filter object", async () => {
    const r = await exportProducts();
    expect(r.success).toBe(true);
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledWith({});
  });

  it("forwards `name` (q) to the use case", async () => {
    await exportProducts({ name: "mouse" });
    expect(executeMock).toHaveBeenCalledWith({ name: "mouse" });
  });

  it("parses `sort: 'price:desc'` into { field, direction } and forwards it", async () => {
    await exportProducts({ sort: "price:desc" });
    expect(executeMock).toHaveBeenCalledWith({
      sort: { field: "price", direction: "desc" },
    });
  });

  it("forwards both name and sort together", async () => {
    await exportProducts({ name: "hub", sort: "stock:asc" });
    expect(executeMock).toHaveBeenCalledWith({
      name: "hub",
      sort: { field: "stock", direction: "asc" },
    });
  });

  it("ignores `page` and `limit` if passed — they don't reach the use case", async () => {
    await exportProducts({
      name: "x",
      sort: "name:asc",
      page: 2,
      limit: 50,
    });
    expect(executeMock).toHaveBeenCalledTimes(1);
    const call = executeMock.mock.calls[0]![0];
    expect(call).not.toHaveProperty("page");
    expect(call).not.toHaveProperty("limit");
    expect(call).toEqual({
      name: "x",
      sort: { field: "name", direction: "asc" },
    });
  });

  it("returns the use case's { filename, content } as ActionResult.data on success", async () => {
    const payload = {
      filename: "products-2026-05-26-0807.csv",
      content: "﻿Nombre,Precio,Stock,Proveedor,Creado\r\nMouse,10.00,1,,2026-04-21T10:15:30.000Z",
    };
    executeMock.mockResolvedValueOnce(payload);
    const r = await exportProducts({});
    expect(r).toEqual({ success: true, data: payload });
  });

  it("rejects malformed sort at the validation boundary", async () => {
    const r = await exportProducts({ sort: "nope" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
    }
    expect(executeMock).not.toHaveBeenCalled();
  });
});
