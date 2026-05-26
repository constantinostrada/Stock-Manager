/**
 * T7 — AC-1: updateProductSchema validates the same rules as createProductSchema
 * (price > 0, name required) plus that `id` is present.
 */
import { describe, expect, it } from "vitest";
import { updateProductSchema } from "@interfaces/validation/productSchemas";

describe("updateProductSchema (T7 AC-1)", () => {
  const valid = {
    id: "p-1",
    name: "Cuaderno",
    categoryId: "cat-1",
    price: 100,
  };

  it("accepts a valid payload", () => {
    const r = updateProductSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it("rejects when id is missing (chequeo de id existente)", () => {
    const { id: _omit, ...rest } = valid;
    const r = updateProductSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it("rejects price of 0 (must be > 0)", () => {
    const r = updateProductSchema.safeParse({ ...valid, price: 0 });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = r.error.errors.find((x) => x.path[0] === "price");
      expect(e?.message).toMatch(/mayor a 0/);
    }
  });

  it("rejects negative price", () => {
    const r = updateProductSchema.safeParse({ ...valid, price: -5 });
    expect(r.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const r = updateProductSchema.safeParse({ ...valid, name: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = r.error.errors.find((x) => x.path[0] === "name");
      expect(e?.message).toMatch(/requerido/);
    }
  });

  it("defaults currency to USD when omitted", () => {
    const r = updateProductSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.currency).toBe("USD");
  });

  it("accepts categoryId === null (clearing the category)", () => {
    const r = updateProductSchema.safeParse({ ...valid, categoryId: null });
    expect(r.success).toBe(true);
  });
});
