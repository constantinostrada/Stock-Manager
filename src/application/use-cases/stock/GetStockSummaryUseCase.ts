/**
 * GetStockSummaryUseCase
 *
 * Returns a dashboard-level summary of the inventory state.
 *
 * LAYER: application
 */

import { StockCalculatorService } from "@domain/services/StockCalculatorService";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import type { StockSummaryDTO } from "@application/dtos/StockDTO";

export class GetStockSummaryUseCase {
  private readonly calculator = new StockCalculatorService();

  constructor(
    private readonly productRepository: IProductRepository,
    private readonly stockRepository: IStockRepository,
  ) {}

  async execute(): Promise<StockSummaryDTO> {
    const [products, stockLevels] = await Promise.all([
      this.productRepository.findAll(),
      this.stockRepository.findAllStockLevels(),
    ]);

    const priceMap = new Map(products.map((p) => [p.id, p.price.amount]));
    const totalInventoryValue = this.calculator.calculateInventoryValue(stockLevels, priceMap);
    const outOfStockIds = this.calculator.getOutOfStockProductIds(stockLevels);
    const lowStockIds = this.calculator.getLowStockProductIds(stockLevels);

    return {
      totalProducts: products.length,
      outOfStockCount: outOfStockIds.length,
      lowStockCount: lowStockIds.length,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      currency: "USD",
    };
  }
}
