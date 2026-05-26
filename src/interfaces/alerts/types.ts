/**
 * Low-Stock Alerts Types
 *
 * Shared shapes for the /alerts surface. Lives in interfaces/ alongside the
 * action that produces it (presentation contract). Kept in a non-action file
 * because the sibling alertsActions.ts uses file-level "use server", which
 * forbids non-async exports (constants, interfaces, helpers).
 *
 * LAYER: interfaces
 */

export type UrgencyLevel = "sin-stock" | "critico" | "bajo" | "atencion";

export interface LowStockProduct {
  productId: string;
  sku: string;
  name: string;
  categoryName: string | null;
  stockActual: number;
  precioUnitario: number;
  currency: string;
  /** stockActual × precioUnitario, the inventory value at risk. */
  stockValue: number;
  urgency: UrgencyLevel;
}

/**
 * Maps a stock quantity to one of the four AC-required urgency bands.
 * Order of checks matters: 0 → sin-stock, <=3 → critico, <=7 → bajo,
 * <10 → atencion. Quantities >= 10 are NOT considered low-stock and
 * shouldn't reach this function (the action filters them out first).
 */
export function urgencyFromStock(qty: number): UrgencyLevel {
  if (qty === 0) return "sin-stock";
  if (qty <= 3) return "critico";
  if (qty <= 7) return "bajo";
  return "atencion";
}
