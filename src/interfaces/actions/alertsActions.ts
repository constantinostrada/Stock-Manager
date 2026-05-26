/**
 * Low-Stock Alerts Server Actions
 *
 * Aggregates products with stock_actual < LOW_STOCK_THRESHOLD into a presentation
 * shape ordered most-critical-first (ASC by stockActual). Used by the /alerts
 * page and by the RootLayout (to drive the Navbar red dot).
 *
 * LAYER: interfaces
 */

"use server";

import {
  listProductsUseCase,
  listStockLevelsUseCase,
} from "@infrastructure/container";
import { LOW_STOCK_THRESHOLD } from "@interfaces/dashboard/constants";
import {
  urgencyFromStock,
  type LowStockProduct,
} from "@interfaces/alerts/types";

/**
 * Returns all products currently below the low-stock threshold, ordered by
 * stockActual ASC (the AC's "más críticos primero").
 *
 * Strict less-than: a product with quantity === LOW_STOCK_THRESHOLD (10) is
 * NOT included — same convention as the dashboard's productosConBajoStock.
 *
 * Returns the array directly (not wrapped in ActionResult) — same convention
 * as getDashboardMetrics.
 */
export async function getLowStockProducts(): Promise<LowStockProduct[]> {
  const [products, stockLevels] = await Promise.all([
    listProductsUseCase.execute({}),
    listStockLevelsUseCase.execute({}),
  ]);

  const productById = new Map(products.map((p) => [p.id, p]));

  const rows: LowStockProduct[] = [];
  for (const level of stockLevels) {
    if (level.quantity >= LOW_STOCK_THRESHOLD) continue;
    const product = productById.get(level.productId);
    if (!product) continue; // stock level orphaned from any current product
    rows.push({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      categoryName: product.categoryName,
      stockActual: level.quantity,
      precioUnitario: product.price,
      currency: product.currency,
      stockValue: level.quantity * product.price,
      urgency: urgencyFromStock(level.quantity),
    });
  }

  rows.sort((a, b) => a.stockActual - b.stockActual);
  return rows;
}
