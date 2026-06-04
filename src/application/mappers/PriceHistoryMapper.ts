/**
 * PriceHistoryMapper
 *
 * Maps between PriceChange domain entities and Price History DTOs.
 *
 * LAYER: application
 */

import type { PriceChange } from "@domain/entities/PriceChange";
import type { PriceChangeDTO } from "@application/dtos/PriceHistoryDTO";

export class PriceHistoryMapper {
  static toDTO(change: PriceChange): PriceChangeDTO {
    return {
      id: change.id,
      productId: change.productId,
      oldPrice: change.oldPrice,
      newPrice: change.newPrice,
      deltaPercent: change.deltaPercent,
      changedAt: change.changedAt.toISOString(),
    };
  }
}
