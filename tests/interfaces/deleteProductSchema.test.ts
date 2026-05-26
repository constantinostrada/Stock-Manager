/**
 * T10 — AC-1: Zod validation for deleteProduct's id input.
 */
import { describe, expect, it } from "vitest";
import { deleteProductSchema } from "@interfaces/validation/productSchemas";

describe("deleteProductSchema (T10 AC-1)", () => {
  it("accepts a non-empty id", () => {
    const r = deleteProductSchema.safeParse({ id: "p-1" });
    expect(r.success).toBe(true);
  });

  it("rejects an empty id", () => {
    const r = deleteProductSchema.safeParse({ id: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a missing id", () => {
    const r = deleteProductSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("rejects a non-string id", () => {
    const r = deleteProductSchema.safeParse({ id: 123 });
    expect(r.success).toBe(false);
  });
});
