/**
 * Stock DTOs
 *
 * Input/output contracts for stock-related use cases.
 *
 * LAYER: application
 */

export interface StockLevelDTO {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  minQuantity: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  updatedAt: string; // ISO 8601
}

export interface StockMovementDTO {
  id: string;
  productId: string;
  productName: string;
  type: string; // "IN" | "OUT" | "ADJUSTMENT"
  quantity: number;
  reason: string | null;
  reference: string | null;
  createdAt: string; // ISO 8601
}

export interface AdjustStockInputDTO {
  productId: string;
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  reason?: string;
  reference?: string;
}

export interface GetStockLevelInputDTO {
  productId: string;
}

export interface ListStockMovementsInputDTO {
  productId?: string;
  type?: string;
  fromDate?: string;
  toDate?: string;
}

export interface StockSummaryDTO {
  totalProducts: number;
  outOfStockCount: number;
  lowStockCount: number;
  totalInventoryValue: number;
  currency: string;
}
