/**
 * Dashboard Server Actions
 *
 * Aggregates inventory metrics for the home page (/).
 *
 * LAYER: interfaces
 */

"use server";

import {
  listProductsUseCase,
  listStockLevelsUseCase,
} from "@infrastructure/container";
import {
  LOW_STOCK_THRESHOLD,
  type DashboardMetrics,
} from "@interfaces/dashboard/constants";

/**
 * Computes the three dashboard metrics by querying the existing product and
 * stock-level use cases and aggregating the result.
 *
 * Returns the metrics directly (not wrapped in ActionResult) because the AC
 * specifies the literal return shape `{ totalProductos, valorTotalInventario,
 * productosConBajoStock }` — callers are server components that surface
 * thrown errors via the Next.js error boundary.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [products, stockLevels] = await Promise.all([
    listProductsUseCase.execute({}),
    listStockLevelsUseCase.execute({}),
  ]);

  const priceById = new Map(products.map((p) => [p.id, p.price]));

  let valorTotalInventario = 0;
  let productosConBajoStock = 0;
  for (const level of stockLevels) {
    const price = priceById.get(level.productId) ?? 0;
    valorTotalInventario += level.quantity * price;
    if (level.quantity < LOW_STOCK_THRESHOLD) {
      productosConBajoStock += 1;
    }
  }

  return {
    totalProductos: products.length,
    valorTotalInventario: Math.round(valorTotalInventario * 100) / 100,
    productosConBajoStock,
  };
}
