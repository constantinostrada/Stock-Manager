/**
 * ListStockLevelsUseCase
 *
 * Returns all stock levels, optionally filtered to low-stock only.
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import type { StockLevelDTO } from "@application/dtos/StockDTO";
import { StockMapper } from "@application/mappers/StockMapper";

export interface ListStockLevelsInputDTO {
  lowStockOnly?: boolean;
}

export class ListStockLevelsUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly stockRepository: IStockRepository,
  ) {}

  async execute(dto: ListStockLevelsInputDTO = {}): Promise<StockLevelDTO[]> {
    const stockLevels = dto.lowStockOnly
      ? await this.stockRepository.findLowStockLevels()
      : await this.stockRepository.findAllStockLevels();

    // Batch-load products
    const productIds = stockLevels.map((s) => s.productId);
    const products = await Promise.all(
      productIds.map((id) => this.productRepository.findById(id)),
    );
    const productMap = new Map(products.filter(Boolean).map((p) => [p!.id, p!]));

    return stockLevels
      .filter((level) => productMap.has(level.productId))
      .map((level) => {
        const product = productMap.get(level.productId)!;
        return StockMapper.stockLevelToDTO(level, product.name, product.sku.value);
      });
  }
}
