/**
 * StockCalculatorService
 *
 * Domain service for calculations that span multiple entities/value objects
 * and don't naturally belong to any single entity.
 *
 * LAYER: domain — zero external imports allowed.
 */

import type { StockMovement } from "@domain/entities/StockMovement";
import type { StockLevel } from "@domain/entities/StockLevel";

export interface StockSummary {
  totalQuantity: number;
  totalIn: number;
  totalOut: number;
  totalAdjustments: number;
  movementCount: number;
}

export class StockCalculatorService {
  /**
   * Computes a summary of stock movements for reporting purposes.
   */
  summariseMovements(movements: StockMovement[]): StockSummary {
    let totalIn = 0;
    let totalOut = 0;
    let totalAdjustments = 0;

    for (const movement of movements) {
      if (movement.type.isInbound) totalIn += movement.quantity;
      else if (movement.type.isOutbound) totalOut += movement.quantity;
      else if (movement.type.isAdjustment) totalAdjustments += movement.quantity;
    }

    return {
      totalQuantity: totalIn - totalOut,
      totalIn,
      totalOut,
      totalAdjustments,
      movementCount: movements.length,
    };
  }

  /**
   * Returns the IDs of products whose stock is at or below their minimum threshold.
   */
  getLowStockProductIds(stockLevels: StockLevel[]): string[] {
    return stockLevels
      .filter((level) => level.isLowStock)
      .map((level) => level.productId);
  }

  /**
   * Returns the IDs of products that are completely out of stock.
   */
  getOutOfStockProductIds(stockLevels: StockLevel[]): string[] {
    return stockLevels
      .filter((level) => level.isOutOfStock)
      .map((level) => level.productId);
  }

  /**
   * Calculates the total inventory value given stock levels and a price-lookup map.
   */
  calculateInventoryValue(
    stockLevels: StockLevel[],
    priceMap: Map<string, number>,
  ): number {
    return stockLevels.reduce((total, level) => {
      const price = priceMap.get(level.productId) ?? 0;
      return total + level.quantity * price;
    }, 0);
  }
}
