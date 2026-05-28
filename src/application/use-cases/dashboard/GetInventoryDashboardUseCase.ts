/**
 * GetInventoryDashboardUseCase
 *
 * Aggregates the metrics shown on /dashboard in a single use case:
 *   - totalProducts            : number of products in the catalog
 *   - totalStockValue          : Σ(product.price × stockLevel.quantity)
 *   - lowStockCount            : count of products with stock < LOW_STOCK_THRESHOLD
 *   - lowestStockProducts      : up to 5 products with the lowest stock
 *
 * Single batched roundtrip per repository (Promise.all over the two repos).
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import {
  INVENTORY_DASHBOARD_LOW_STOCK_THRESHOLD,
  type InventoryDashboardDTO,
  type InventoryDashboardLowStockProductDTO,
} from "@application/dtos/InventoryDashboardDTO";

const LOWEST_STOCK_LIMIT = 5;

export class GetInventoryDashboardUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly stockRepository: IStockRepository,
  ) {}

  async execute(): Promise<InventoryDashboardDTO> {
    const [products, stockLevels] = await Promise.all([
      this.productRepository.findAll(),
      this.stockRepository.findAllStockLevels(),
    ]);

    const stockByProductId = new Map<string, number>();
    for (const level of stockLevels) {
      stockByProductId.set(level.productId, level.quantity);
    }

    let totalStockValue = 0;
    const productStocks: InventoryDashboardLowStockProductDTO[] = [];
    let lowStockCount = 0;

    for (const product of products) {
      const stock = stockByProductId.get(product.id) ?? 0;
      totalStockValue += product.price.amount * stock;
      if (stock < INVENTORY_DASHBOARD_LOW_STOCK_THRESHOLD) {
        lowStockCount += 1;
      }
      productStocks.push({
        productId: product.id,
        name: product.name,
        currentStock: stock,
      });
    }

    productStocks.sort((a, b) => {
      if (a.currentStock !== b.currentStock) return a.currentStock - b.currentStock;
      return a.name.localeCompare(b.name);
    });

    return {
      totalProducts: products.length,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      lowStockCount,
      lowestStockProducts: productStocks.slice(0, LOWEST_STOCK_LIMIT),
    };
  }
}
