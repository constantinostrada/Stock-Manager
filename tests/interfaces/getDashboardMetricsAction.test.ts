/**
 * AC-1: Server Action getDashboardMetrics() retorna
 *       { totalProductos, valorTotalInventario, productosConBajoStock }.
 *       Constante LOW_STOCK_THRESHOLD = 10 exportada.
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

import { getDashboardMetrics } from "@interfaces/actions/dashboardActions";
import { LOW_STOCK_THRESHOLD } from "@interfaces/dashboard/constants";

beforeEach(() => {
  listProductsExecute.mockReset();
  listStockLevelsExecute.mockReset();
});

describe("LOW_STOCK_THRESHOLD constant (AC-1)", () => {
  it("is exported and equals 10", () => {
    expect(LOW_STOCK_THRESHOLD).toBe(10);
  });
});

describe("getDashboardMetrics Server Action (AC-1)", () => {
  it("returns the three keys required by the AC", async () => {
    listProductsExecute.mockResolvedValueOnce([]);
    listStockLevelsExecute.mockResolvedValueOnce([]);
    const metrics = await getDashboardMetrics();
    expect(Object.keys(metrics).sort()).toEqual(
      ["productosConBajoStock", "totalProductos", "valorTotalInventario"].sort(),
    );
    expect(metrics).toEqual({
      totalProductos: 0,
      valorTotalInventario: 0,
      productosConBajoStock: 0,
    });
  });

  it("totalProductos counts every product returned by listProducts", async () => {
    listProductsExecute.mockResolvedValueOnce([
      productDTO("p1", 100),
      productDTO("p2", 50),
      productDTO("p3", 25),
    ]);
    listStockLevelsExecute.mockResolvedValueOnce([]);
    const metrics = await getDashboardMetrics();
    expect(metrics.totalProductos).toBe(3);
  });

  it("valorTotalInventario = sum of quantity × price across stock levels", async () => {
    listProductsExecute.mockResolvedValueOnce([
      productDTO("p1", 100),
      productDTO("p2", 50),
    ]);
    listStockLevelsExecute.mockResolvedValueOnce([
      stockLevelDTO("p1", 5), // 5 × 100 = 500
      stockLevelDTO("p2", 3), // 3 × 50  = 150
    ]);
    const metrics = await getDashboardMetrics();
    expect(metrics.valorTotalInventario).toBe(650);
  });

  it("productosConBajoStock counts stock levels with quantity < LOW_STOCK_THRESHOLD (10)", async () => {
    listProductsExecute.mockResolvedValueOnce([
      productDTO("p1", 1),
      productDTO("p2", 1),
      productDTO("p3", 1),
      productDTO("p4", 1),
    ]);
    listStockLevelsExecute.mockResolvedValueOnce([
      stockLevelDTO("p1", 0), // < 10 → counts
      stockLevelDTO("p2", 9), // < 10 → counts
      stockLevelDTO("p3", 10), // == 10 → NOT counted (strictly less than)
      stockLevelDTO("p4", 25), // > 10 → not counted
    ]);
    const metrics = await getDashboardMetrics();
    expect(metrics.productosConBajoStock).toBe(2);
  });

  it("rounds valorTotalInventario to 2 decimal places", async () => {
    listProductsExecute.mockResolvedValueOnce([productDTO("p1", 0.1)]);
    listStockLevelsExecute.mockResolvedValueOnce([stockLevelDTO("p1", 3)]);
    const metrics = await getDashboardMetrics();
    // 3 × 0.1 = 0.30000000000000004 in IEEE 754 — must round to 0.3
    expect(metrics.valorTotalInventario).toBe(0.3);
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
    createdAt: "2026-05-25T00:00:00Z",
    updatedAt: "2026-05-25T00:00:00Z",
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
    updatedAt: "2026-05-25T00:00:00Z",
  };
}
