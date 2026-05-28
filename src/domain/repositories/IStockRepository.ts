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
  /** Optional pagination — must be paired with offset. Ignored if undefined. */
  limit?: number;
  offset?: number;
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
  countMovements(filters?: Omit<StockMovementFilters, "limit" | "offset">): Promise<number>;
  saveMovement(movement: StockMovement): Promise<StockMovement>;

  /**
   * Atomically persists a movement audit record AND its resulting stock level
   * in a single transaction. Either both writes commit or both roll back.
   */
  applyMovement(
    stockLevel: StockLevel,
    movement: StockMovement,
  ): Promise<{ stockLevel: StockLevel; movement: StockMovement }>;
}
