/**
 * T12 — AC-2: Server Action getLowStockProducts() returns products with
 * stock_actual < LOW_STOCK_THRESHOLD (10), sorted ASC by stock (most critical
 * first), and enriches each row with sku/name/category/price/value/urgency.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const listProductsExecute = vi.fn();
const listStockLevelsExecute = vi.fn();

vi.mock("@infrastructure/container", () => ({
  listProductsUseCase: {
    execute: (...args: unknown[]) => listProductsExecute(...args),
  },
  listStockLevelsUseCase: {
    execute: (...args: unknown[]) => listStockLevelsExecute(...args),
  },
}));

import { getLowStockProducts } from "@interfaces/actions/alertsActions";
import { LOW_STOCK_THRESHOLD } from "@interfaces/dashboard/constants";
import { urgencyFromStock } from "@interfaces/alerts/types";

beforeEach(() => {
  listProductsExecute.mockReset();
  listStockLevelsExecute.mockReset();
});

function productDTO(
  id: string,
  overrides: Partial<{
    sku: string;
    name: string;
    price: number;
    currency: string;
    categoryName: string | null;
  }> = {},
) {
  return {
    id,
    name: overrides.name ?? `Product ${id}`,
    description: null,
    sku: overrides.sku ?? `SKU-${id}`,
    price: overrides.price ?? 100,
    currency: overrides.currency ?? "USD",
    categoryId: null,
    categoryName: overrides.categoryName ?? null,
    createdAt: "2026-05-26T00:00:00Z",
    updatedAt: "2026-05-26T00:00:00Z",
  };
}

function stockLevelDTO(productId: string, quantity: number) {
  return {
    id: `sl-${productId}`,
    productId,
    productName: `Product ${productId}`,
    productSku: `SKU-${productId}`,
    quantity,
    minQuantity: 0,
    isLowStock: false,
    isOutOfStock: quantity === 0,
    updatedAt: "2026-05-26T00:00:00Z",
  };
}

describe("urgencyFromStock helper (AC-5..9)", () => {
  it("0 → sin-stock", () => {
    expect(urgencyFromStock(0)).toBe("sin-stock");
  });
  it("1..3 → critico", () => {
    expect(urgencyFromStock(1)).toBe("critico");
    expect(urgencyFromStock(3)).toBe("critico");
  });
  it("4..7 → bajo", () => {
    expect(urgencyFromStock(4)).toBe("bajo");
    expect(urgencyFromStock(7)).toBe("bajo");
  });
  it("8..9 → atencion", () => {
    expect(urgencyFromStock(8)).toBe("atencion");
    expect(urgencyFromStock(9)).toBe("atencion");
  });
});

describe("getLowStockProducts (AC-2)", () => {
  it("returns only products with quantity STRICTLY less than LOW_STOCK_THRESHOLD", async () => {
    expect(LOW_STOCK_THRESHOLD).toBe(10);
    listProductsExecute.mockResolvedValueOnce([
      productDTO("p1"),
      productDTO("p2"),
      productDTO("p3"),
      productDTO("p4"),
    ]);
    listStockLevelsExecute.mockResolvedValueOnce([
      stockLevelDTO("p1", 0), // included
      stockLevelDTO("p2", 9), // included
      stockLevelDTO("p3", 10), // EXCLUDED — strict <
      stockLevelDTO("p4", 25), // excluded
    ]);
    const rows = await getLowStockProducts();
    const ids = rows.map((r) => r.productId);
    expect(ids).toEqual(["p1", "p2"]);
  });

  it("orders rows ASC by stockActual (most critical first)", async () => {
    listProductsExecute.mockResolvedValueOnce([
      productDTO("a"),
      productDTO("b"),
      productDTO("c"),
      productDTO("d"),
    ]);
    listStockLevelsExecute.mockResolvedValueOnce([
      stockLevelDTO("a", 7),
      stockLevelDTO("b", 0),
      stockLevelDTO("c", 3),
      stockLevelDTO("d", 9),
    ]);
    const rows = await getLowStockProducts();
    expect(rows.map((r) => r.stockActual)).toEqual([0, 3, 7, 9]);
    expect(rows.map((r) => r.productId)).toEqual(["b", "c", "a", "d"]);
  });

  it("enriches rows with sku/name/category/price/stockValue/urgency", async () => {
    listProductsExecute.mockResolvedValueOnce([
      productDTO("p1", {
        sku: "MS-01",
        name: "Mouse",
        price: 50,
        currency: "ARS",
        categoryName: "Periféricos",
      }),
    ]);
    listStockLevelsExecute.mockResolvedValueOnce([stockLevelDTO("p1", 2)]);
    const [row] = await getLowStockProducts();
    expect(row).toEqual({
      productId: "p1",
      sku: "MS-01",
      name: "Mouse",
      categoryName: "Periféricos",
      stockActual: 2,
      precioUnitario: 50,
      currency: "ARS",
      stockValue: 100, // 2 × 50
      urgency: "critico",
    });
  });

  it("returns empty array when no stock levels are below threshold", async () => {
    listProductsExecute.mockResolvedValueOnce([productDTO("p1")]);
    listStockLevelsExecute.mockResolvedValueOnce([stockLevelDTO("p1", 50)]);
    const rows = await getLowStockProducts();
    expect(rows).toEqual([]);
  });

  it("skips stock levels whose productId has no matching product (orphan-safe)", async () => {
    listProductsExecute.mockResolvedValueOnce([productDTO("p1")]);
    listStockLevelsExecute.mockResolvedValueOnce([
      stockLevelDTO("p1", 1),
      stockLevelDTO("ghost", 0),
    ]);
    const rows = await getLowStockProducts();
    expect(rows.map((r) => r.productId)).toEqual(["p1"]);
  });
});
