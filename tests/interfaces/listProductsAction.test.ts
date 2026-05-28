/**
 * T19 — AC-3: the listProducts Server Action accepts a `supplierId` filter
 * via Zod and forwards it to listProductsUseCase.execute. The use case then
 * applies it server-side in the Prisma findAll query.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const executeMock = vi.fn();

vi.mock("@infrastructure/container", () => ({
  listProductsUseCase: {
    execute: (...args: unknown[]) => executeMock(...args),
  },
  // Re-exports used elsewhere in productActions — provide no-op stubs.
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

describe("listProducts Server Action (T19 AC-3)", () => {
  it("forwards supplierId to listProductsUseCase.execute", async () => {
    const r = await listProducts({ supplierId: "sup-acme" });
    expect(r.success).toBe(true);
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ supplierId: "sup-acme" }),
    );
  });

  it("works with no input at all (no supplierId)", async () => {
    const r = await listProducts();
    expect(r.success).toBe(true);
    expect(executeMock).toHaveBeenCalledTimes(1);
    const callArg = executeMock.mock.calls[0]?.[0] ?? {};
    expect(callArg.supplierId).toBeUndefined();
  });

  it("does not break when supplierId is mixed with other supported filters", async () => {
    await listProducts({ supplierId: "sup-x", categoryId: "cat-y", name: "hub" });
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierId: "sup-x",
        categoryId: "cat-y",
        name: "hub",
      }),
    );
  });

  it("rejects a non-string supplierId at the validation boundary", async () => {
    const r = await listProducts({ supplierId: 42 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
    }
    expect(executeMock).not.toHaveBeenCalled();
  });
});
