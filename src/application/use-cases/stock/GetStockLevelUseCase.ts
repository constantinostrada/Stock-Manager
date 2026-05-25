/**
 * GetStockLevelUseCase
 *
 * Returns the current stock level for a product.
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import type { GetStockLevelInputDTO, StockLevelDTO } from "@application/dtos/StockDTO";
import { StockMapper } from "@application/mappers/StockMapper";
import { NotFoundException } from "@application/exceptions/ApplicationException";

export class GetStockLevelUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly stockRepository: IStockRepository,
  ) {}

  async execute(dto: GetStockLevelInputDTO): Promise<StockLevelDTO> {
    const product = await this.productRepository.findById(dto.productId);
    if (!product) {
      throw new NotFoundException("Product", dto.productId);
    }

    const stockLevel = await this.stockRepository.findStockLevelByProductId(dto.productId);
    if (!stockLevel) {
      throw new NotFoundException("StockLevel for product", dto.productId);
    }

    return StockMapper.stockLevelToDTO(stockLevel, product.name, product.sku.value);
  }
}
