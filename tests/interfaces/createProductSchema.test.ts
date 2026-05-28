/**
 * AC-1 covers: createProductSchema validates SKU presence, stock >= 0, price > 0.
 */
import { describe, expect, it } from "vitest";
import { createProductSchema } from "@interfaces/validation/productSchemas";

describe("createProductSchema (AC-1: Zod validation)", () => {
  const valid = {
    sku: "ABC-001",
    name: "Cuaderno",
    categoryId: "cat-1",
    price: 100,
    stockInicial: 5,
  };

  it("accepts a valid payload with positive price and non-negative stock", () => {
    const result = createProductSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects a price of 0 (must be > 0)", () => {
    const result = createProductSchema.safeParse({ ...valid, price: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pricePath = result.error.errors.find((e) => e.path[0] === "price");
      expect(pricePath?.message).toMatch(/mayor a 0/);
    }
  });

  it("rejects a negative price", () => {
    const result = createProductSchema.safeParse({ ...valid, price: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects negative stockInicial (stock must be >= 0)", () => {
    const result = createProductSchema.safeParse({ ...valid, stockInicial: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const stockPath = result.error.errors.find(
        (e) => e.path[0] === "stockInicial",
      );
      expect(stockPath?.message).toMatch(/negativo/);
    }
  });

  it("rejects a non-integer stockInicial", () => {
    const result = createProductSchema.safeParse({ ...valid, stockInicial: 1.5 });
    expect(result.success).toBe(false);
  });

  it("accepts stockInicial of 0 (>= 0 boundary)", () => {
    const result = createProductSchema.safeParse({ ...valid, stockInicial: 0 });
    expect(result.success).toBe(true);
  });

  it("defaults stockInicial to 0 when omitted", () => {
    const { stockInicial: _omit, ...rest } = valid;
    const result = createProductSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.stockInicial).toBe(0);
  });

  it("rejects a missing SKU", () => {
    const { sku: _omit, ...rest } = valid;
    const result = createProductSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects a SKU shorter than 2 characters", () => {
    const result = createProductSchema.safeParse({ ...valid, sku: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing name", () => {
    const { name: _omit, ...rest } = valid;
    const result = createProductSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("T18: accepts an optional supplierId as a non-empty string", () => {
    const result = createProductSchema.safeParse({
      ...valid,
      supplierId: "sup-acme",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.supplierId).toBe("sup-acme");
    }
  });

  it("T18: accepts a null supplierId", () => {
    const result = createProductSchema.safeParse({
      ...valid,
      supplierId: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.supplierId).toBeNull();
    }
  });

  it("T18: accepts an omitted supplierId (field is optional)", () => {
    const result = createProductSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});
