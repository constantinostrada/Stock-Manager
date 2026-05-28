/**
 * Inventory Dashboard DTOs
 *
 * Output contract for GetInventoryDashboardUseCase.
 *
 * LAYER: application
 */

/** Strict less-than threshold used by GetInventoryDashboardUseCase to flag low-stock items. */
export const INVENTORY_DASHBOARD_LOW_STOCK_THRESHOLD = 5;

export interface InventoryDashboardLowStockProductDTO {
  productId: string;
  name: string;
  currentStock: number;
}

export interface InventoryDashboardDTO {
  totalProducts: number;
  /** Sum of (product.price * stockLevel.quantity) across the catalog. Rounded to 2 decimals. */
  totalStockValue: number;
  /** Count of products whose current stock is strictly less than LOW_STOCK_THRESHOLD. */
  lowStockCount: number;
  /** Up to 5 products with the lowest current stock, ASC by stock then by name. */
  lowestStockProducts: InventoryDashboardLowStockProductDTO[];
}
