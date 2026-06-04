/**
 * Inventory Valuation Report DTOs
 *
 * Output contract for GetInventoryValuationReportUseCase.
 *
 * LAYER: application
 */

/** Group label for products without a category. */
export const VALUATION_UNCATEGORIZED_LABEL = "Uncategorized";
/** Group label for products without a supplier. */
export const VALUATION_NO_SUPPLIER_LABEL = "No supplier";

export interface ValuationBreakdownRowDTO {
  /** Category/Supplier id, or null for the Uncategorized / No supplier group. */
  groupId: string | null;
  /** Category/Supplier name, or the fallback label for ungrouped products. */
  groupName: string;
  /** Σ(price × quantity) for the group. Rounded to 2 decimals. */
  totalValue: number;
  /** Σ(quantity) for the group. */
  totalUnits: number;
  /** Number of distinct products in the group. */
  productCount: number;
  /** Share of the grand total, 0–100. Rounded to 1 decimal. 0 when grand total is 0. */
  percentOfTotal: number;
}

export interface InventoryValuationReportDTO {
  /** Σ(price × quantity) across all ACTIVE (non-deleted) products. Rounded to 2 decimals. */
  grandTotal: number;
  /** Σ(quantity) across all active products. */
  totalUnits: number;
  /** Number of active products included in the valuation. */
  totalProducts: number;
  /** Per-category breakdown, sorted by totalValue DESC then name ASC. */
  byCategory: ValuationBreakdownRowDTO[];
  /** Per-supplier breakdown, sorted by totalValue DESC then name ASC. */
  bySupplier: ValuationBreakdownRowDTO[];
}
