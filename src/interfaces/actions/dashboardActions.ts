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
  listStockMovementsUseCase,
} from "@infrastructure/container";
import {
  LOW_STOCK_THRESHOLD,
  type DashboardMetrics,
  type TodaysSummary,
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

/**
 * Aggregates today's stock movements into counts per type plus the total value
 * moved (Σ quantity × product.price across every movement, regardless of type).
 *
 * "Today" starts at server-local midnight; the filter passes the ISO timestamp
 * to `listStockMovementsUseCase`, which forwards it as a `gte` createdAt
 * predicate to the Prisma repository.
 */
export async function getTodaysSummary(): Promise<TodaysSummary> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [movements, products] = await Promise.all([
    listStockMovementsUseCase.execute({ fromDate: startOfToday.toISOString() }),
    listProductsUseCase.execute({}),
  ]);

  const priceById = new Map(products.map((p) => [p.id, p.price]));

  let entradasCount = 0;
  let salidasCount = 0;
  let ajustesCount = 0;
  let totalValueMoved = 0;
  for (const movement of movements) {
    if (movement.type === "IN") entradasCount += 1;
    else if (movement.type === "OUT") salidasCount += 1;
    else if (movement.type === "ADJUSTMENT") ajustesCount += 1;
    const price = priceById.get(movement.productId) ?? 0;
    totalValueMoved += movement.quantity * price;
  }

  return {
    entradasCount,
    salidasCount,
    ajustesCount,
    totalValueMoved: Math.round(totalValueMoved * 100) / 100,
  };
}
