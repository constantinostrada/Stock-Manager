/**
 * Price History DTOs
 *
 * Input/output contracts for price-history use cases.
 *
 * LAYER: application
 */

export interface PriceChangeDTO {
  id: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  /** Percent delta relative to oldPrice; null when oldPrice was 0. */
  deltaPercent: number | null;
  changedAt: string; // ISO 8601
}

export interface GetProductPriceHistoryInputDTO {
  productId: string;
}

export interface GetProductPriceHistoryResultDTO {
  /** Price changes ordered oldest first (chronological ASC). */
  entries: PriceChangeDTO[];
}
