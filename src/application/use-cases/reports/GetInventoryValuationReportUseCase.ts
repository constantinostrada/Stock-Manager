/**
 * GetInventoryValuationReportUseCase
 *
 * Aggregates the data shown on /reports/valuation in a single use case:
 *   - grandTotal   : Σ(product.price × stockLevel.quantity) across the catalog
 *   - byCategory   : value / units / % of total per category
 *   - bySupplier   : value / units / % of total per supplier
 *
 * Products without a category or supplier are grouped under
 * "Uncategorized" / "No supplier". Soft-deleted products are excluded
 * (productRepository.findAll only returns active rows).
 *
 * Single batched roundtrip per repository (Promise.all over the four repos).
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import {
  VALUATION_NO_SUPPLIER_LABEL,
  VALUATION_UNCATEGORIZED_LABEL,
  type InventoryValuationReportDTO,
  type ValuationBreakdownRowDTO,
} from "@application/dtos/InventoryValuationReportDTO";

interface MutableBreakdownRow {
  groupId: string | null;
  groupName: string;
  totalValue: number;
  totalUnits: number;
  productCount: number;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toBreakdownRows(
  groups: Map<string | null, MutableBreakdownRow>,
  grandTotal: number,
): ValuationBreakdownRowDTO[] {
  const rows = Array.from(groups.values()).map((row) => ({
    groupId: row.groupId,
    groupName: row.groupName,
    totalValue: roundMoney(row.totalValue),
    totalUnits: row.totalUnits,
    productCount: row.productCount,
    percentOfTotal:
      grandTotal > 0 ? Math.round((row.totalValue / grandTotal) * 1000) / 10 : 0,
  }));
  rows.sort((a, b) => {
    if (a.totalValue !== b.totalValue) return b.totalValue - a.totalValue;
    return a.groupName.localeCompare(b.groupName);
  });
  return rows;
}

export class GetInventoryValuationReportUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly stockRepository: IStockRepository,
    private readonly categoryRepository: ICategoryRepository,
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(): Promise<InventoryValuationReportDTO> {
    const [products, stockLevels, categories, suppliers] = await Promise.all([
      this.productRepository.findAll(),
      this.stockRepository.findAllStockLevels(),
      this.categoryRepository.findAll(),
      this.supplierRepository.findAll(),
    ]);

    const stockByProductId = new Map<string, number>();
    for (const level of stockLevels) {
      stockByProductId.set(level.productId, level.quantity);
    }
    const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
    const supplierNameById = new Map(suppliers.map((s) => [s.id, s.name]));

    const byCategory = new Map<string | null, MutableBreakdownRow>();
    const bySupplier = new Map<string | null, MutableBreakdownRow>();

    let grandTotal = 0;
    let totalUnits = 0;

    for (const product of products) {
      const quantity = stockByProductId.get(product.id) ?? 0;
      const value = product.price.amount * quantity;
      grandTotal += value;
      totalUnits += quantity;

      // A categoryId/supplierId pointing at a missing row is treated the same
      // as null — the product still has to land in exactly one group.
      const categoryKey =
        product.categoryId !== null && categoryNameById.has(product.categoryId)
          ? product.categoryId
          : null;
      const supplierKey =
        product.supplierId !== null && supplierNameById.has(product.supplierId)
          ? product.supplierId
          : null;

      this.accumulate(
        byCategory,
        categoryKey,
        categoryKey !== null
          ? (categoryNameById.get(categoryKey) as string)
          : VALUATION_UNCATEGORIZED_LABEL,
        value,
        quantity,
      );
      this.accumulate(
        bySupplier,
        supplierKey,
        supplierKey !== null
          ? (supplierNameById.get(supplierKey) as string)
          : VALUATION_NO_SUPPLIER_LABEL,
        value,
        quantity,
      );
    }

    return {
      grandTotal: roundMoney(grandTotal),
      totalUnits,
      totalProducts: products.length,
      byCategory: toBreakdownRows(byCategory, grandTotal),
      bySupplier: toBreakdownRows(bySupplier, grandTotal),
    };
  }

  private accumulate(
    groups: Map<string | null, MutableBreakdownRow>,
    groupId: string | null,
    groupName: string,
    value: number,
    quantity: number,
  ): void {
    let row = groups.get(groupId);
    if (!row) {
      row = { groupId, groupName, totalValue: 0, totalUnits: 0, productCount: 0 };
      groups.set(groupId, row);
    }
    row.totalValue += value;
    row.totalUnits += quantity;
    row.productCount += 1;
  }
}
