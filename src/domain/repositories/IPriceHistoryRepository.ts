/**
 * IPriceHistoryRepository
 *
 * Repository interface for PriceChange audit records.
 *
 * LAYER: domain — zero external imports allowed.
 */

import type { PriceChange } from "@domain/entities/PriceChange";

export interface IPriceHistoryRepository {
  save(change: PriceChange): Promise<PriceChange>;
  /** Returns every price change for a product, oldest first (changedAt ASC). */
  findByProductId(productId: string): Promise<PriceChange[]>;
}
