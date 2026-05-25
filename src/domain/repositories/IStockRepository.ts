/**
 * IStockRepository
 *
 * Repository interface for StockLevel and StockMovement aggregates.
 *
 * LAYER: domain — zero external imports allowed.
 */

import type { StockLevel } from "@domain/entities/StockLevel";
import type { StockMovement } from "@domain/entities/StockMovement";

export interface StockMovementFilters {
  productId?: string;
  type?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface IStockRepository {
  // Stock levels
  findStockLevelByProductId(productId: string): Promise<StockLevel | null>;
  findAllStockLevels(): Promise<StockLevel[]>;
  findLowStockLevels(): Promise<StockLevel[]>;
  saveStockLevel(stockLevel: StockLevel): Promise<StockLevel>;

  // Stock movements
  findMovementById(id: string): Promise<StockMovement | null>;
  findMovements(filters?: StockMovementFilters): Promise<StockMovement[]>;
  saveMovement(movement: StockMovement): Promise<StockMovement>;
}
