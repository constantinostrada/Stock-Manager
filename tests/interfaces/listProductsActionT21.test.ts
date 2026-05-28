/**
 * T21 — AC: "Tests: action (lee query param)".
 *
 * Verifies the listProducts Server Action accepts the `name` field (which the
 * /products page derives from the URL `?q=` param) and forwards it to
 * listProductsUseCase.execute, so the Prisma layer can apply the
 * case-insensitive `contains` filter.
 *
 * Complements the existing `listProductsAction.test.ts` (T19) which focused
 * on supplierId.
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
  updateProductUseCase: { execute: vi.fn() },
  deleteProductUseCase: { execute: vi.fn() },
  deleteProductsBulkUseCase: { execute: vi.fn() },
}));

import { listProducts } from "@interfaces/actions/productActions";

beforeEach(() => {
  executeMock.mockReset();
  executeMock.mockResolvedValue([]);
});

describe("listProducts Server Action — T21 query param", () => {
  it("forwards `name` (the URL ?q value) to listProductsUseCase.execute", async () => {
    const r = await listProducts({ name: "mouse" });
    expect(r.success).toBe(true);
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "mouse" }),
    );
  });

  it("when no `name` is given (q vacío), use case is still invoked but without a name filter", async () => {
    const r = await listProducts({});
    expect(r.success).toBe(true);
    expect(executeMock).toHaveBeenCalledTimes(1);
    const callArg = executeMock.mock.calls[0]?.[0] ?? {};
    expect(callArg.name).toBeUndefined();
  });

  it("preserves `name` alongside the existing supplierId filter", async () => {
    await listProducts({ name: "hub", supplierId: "sup-acme" });
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "hub", supplierId: "sup-acme" }),
    );
  });

  it("rejects a non-string `name` at the validation boundary", async () => {
    const r = await listProducts({ name: 42 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
    }
    expect(executeMock).not.toHaveBeenCalled();
  });
});
