/**
 * Dashboard Constants
 *
 * Presentation-layer constants used by the dashboard surface. Lives outside
 * the "use server" action file because Next.js requires every export from a
 * file-level "use server" module to be an async function.
 *
 * LAYER: interfaces
 */

/**
 * Threshold below which a product is considered "low stock" on the dashboard.
 * AC-1 requires this constant to be exported.
 */
export const LOW_STOCK_THRESHOLD = 10;

export interface DashboardMetrics {
  totalProductos: number;
  valorTotalInventario: number;
  productosConBajoStock: number;
}
