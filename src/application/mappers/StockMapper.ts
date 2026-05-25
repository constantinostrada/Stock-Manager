/**
 * StockMapper
 *
 * Maps between Stock domain entities and Stock DTOs.
 *
 * LAYER: application
 */

import type { StockLevel } from "@domain/entities/StockLevel";
import type { StockMovement } from "@domain/entities/StockMovement";
import type { StockLevelDTO, StockMovementDTO } from "@application/dtos/StockDTO";

export class StockMapper {
  static stockLevelToDTO(
    stockLevel: StockLevel,
    productName: string,
    productSku: string,
  ): StockLevelDTO {
    return {
      id: stockLevel.id,
      productId: stockLevel.productId,
      productName,
      productSku,
      quantity: stockLevel.quantity,
      minQuantity: stockLevel.minQuantity,
      isLowStock: stockLevel.isLowStock,
      isOutOfStock: stockLevel.isOutOfStock,
      updatedAt: stockLevel.updatedAt.toISOString(),
    };
  }

  static movementToDTO(movement: StockMovement, productName: string): StockMovementDTO {
    return {
      id: movement.id,
      productId: movement.productId,
      productName,
      type: movement.type.value,
      quantity: movement.quantity,
      reason: movement.reason,
      reference: movement.reference,
      createdAt: movement.createdAt.toISOString(),
    };
  }
}
