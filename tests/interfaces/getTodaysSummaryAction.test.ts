/**
 * T16 — Server Action `getTodaysSummary` (AC-1, AC-2).
 *
 * AC-1: returns `{ entradasCount, salidasCount, ajustesCount, totalValueMoved }`
 *       built from movements whose date is from the start of today.
 * AC-2: `totalValueMoved` = Σ cantidad × product.price across every movement
 *       of the day, independent of type.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const listProductsExecute = vi.fn();
const listStockLevelsExecute = vi.fn();
const listStockMovementsExecute = vi.fn();

vi.mock("@infrastructure/container", () => ({
  listProductsUseCase: {
    execute: (...args: unknown[]) => listProductsExecute(...args),
  },
  listStockLevelsUseCase: {
    execute: (...args: unknown[]) => listStockLevelsExecute(...args),
  },
  listStockMovementsUseCase: {
    execute: (...args: unknown[]) => listStockMovementsExecute(...args),
  },
}));

import { getTodaysSummary } from "@interfaces/actions/dashboardActions";

beforeEach(() => {
  listProductsExecute.mockReset();
  listStockLevelsExecute.mockReset();
  listStockMovementsExecute.mockReset();
});

describe("getTodaysSummary Server Action — shape and date filter (AC-1)", () => {
  it("returns exactly the four AC-required keys", async () => {
    listStockMovementsExecute.mockResolvedValueOnce([]);
    listProductsExecute.mockResolvedValueOnce([]);

    const summary = await getTodaysSummary();

    expect(Object.keys(summary).sort()).toEqual(
      ["ajustesCount", "entradasCount", "salidasCount", "totalValueMoved"].sort(),
    );
    expect(summary).toEqual({
      entradasCount: 0,
      salidasCount: 0,
      ajustesCount: 0,
      totalValueMoved: 0,
    });
  });

  it("filters movements by fromDate = start of today (server-local midnight)", async () => {
    listStockMovementsExecute.mockResolvedValueOnce([]);
    listProductsExecute.mockResolvedValueOnce([]);

    await getTodaysSummary();

    expect(listStockMovementsExecute).toHaveBeenCalledTimes(1);
    const arg = listStockMovementsExecute.mock.calls[0][0] as { fromDate: string };
    expect(typeof arg.fromDate).toBe("string");

    const passed = new Date(arg.fromDate);
    const expected = new Date();
    expected.setHours(0, 0, 0, 0);
    // The action sets H/M/S/ms to 0; the stamp should be at most 1 second
    // away from our reference (allows for clock drift between the two calls).
    expect(Math.abs(passed.getTime() - expected.getTime())).toBeLessThan(1000);
    // And it must be at midnight, not "now".
    expect(passed.getHours()).toBe(0);
    expect(passed.getMinutes()).toBe(0);
    expect(passed.getSeconds()).toBe(0);
    expect(passed.getMilliseconds()).toBe(0);
  });

  it("counts entradas (IN), salidas (OUT) and ajustes (ADJUSTMENT) by type", async () => {
    listStockMovementsExecute.mockResolvedValueOnce([
      movement("m1", "p1", "IN", 3),
      movement("m2", "p1", "IN", 1),
      movement("m3", "p2", "OUT", 2),
      movement("m4", "p2", "ADJUSTMENT", 5),
      movement("m5", "p1", "ADJUSTMENT", 1),
      movement("m6", "p1", "ADJUSTMENT", 2),
    ]);
    listProductsExecute.mockResolvedValueOnce([
      productDTO("p1", 100),
      productDTO("p2", 50),
    ]);

    const summary = await getTodaysSummary();

    expect(summary.entradasCount).toBe(2);
    expect(summary.salidasCount).toBe(1);
    expect(summary.ajustesCount).toBe(3);
  });
});

describe("getTodaysSummary — totalValueMoved (AC-2)", () => {
  it("sums quantity × product.price across every movement of the day, regardless of type", async () => {
    listStockMovementsExecute.mockResolvedValueOnce([
      // p1 @ 100
      movement("m1", "p1", "IN", 5), //          5 × 100 =  500
      movement("m2", "p1", "OUT", 2), //         2 × 100 =  200
      movement("m3", "p1", "ADJUSTMENT", 1), //  1 × 100 =  100
      // p2 @ 50
      movement("m4", "p2", "OUT", 3), //         3 × 50  =  150
      movement("m5", "p2", "ADJUSTMENT", 4), //  4 × 50  =  200
    ]);
    listProductsExecute.mockResolvedValueOnce([
      productDTO("p1", 100),
      productDTO("p2", 50),
    ]);

    const summary = await getTodaysSummary();

    // 500 + 200 + 100 + 150 + 200 = 1150
    expect(summary.totalValueMoved).toBe(1150);
  });

  it("uses 0 as the price when a product is missing (defensive)", async () => {
    listStockMovementsExecute.mockResolvedValueOnce([
      movement("m1", "ghost", "IN", 999),
    ]);
    listProductsExecute.mockResolvedValueOnce([]);

    const summary = await getTodaysSummary();

    expect(summary.totalValueMoved).toBe(0);
    expect(summary.entradasCount).toBe(1);
  });

  it("rounds totalValueMoved to 2 decimal places", async () => {
    listStockMovementsExecute.mockResolvedValueOnce([
      movement("m1", "p1", "IN", 3),
    ]);
    listProductsExecute.mockResolvedValueOnce([productDTO("p1", 0.1)]);

    const summary = await getTodaysSummary();

    // 3 × 0.1 = 0.30000000000000004 in IEEE 754 — must round to 0.3
    expect(summary.totalValueMoved).toBe(0.3);
  });
});

// ─── helpers ────────────────────────────────────────────────────────────────

function productDTO(id: string, price: number) {
  return {
    id,
    name: `Product ${id}`,
    description: null,
    sku: `SKU-${id}`,
    price,
    currency: "USD",
    categoryId: null,
    categoryName: null,
    createdAt: "2026-05-26T00:00:00Z",
    updatedAt: "2026-05-26T00:00:00Z",
  };
}

function movement(
  id: string,
  productId: string,
  type: "IN" | "OUT" | "ADJUSTMENT",
  quantity: number,
) {
  return {
    id,
    productId,
    productName: `Product ${productId}`,
    type,
    quantity,
    reason: null,
    reference: null,
    createdAt: new Date().toISOString(),
  };
}
