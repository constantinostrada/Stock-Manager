/**
 * GetProductPriceHistoryUseCase
 *
 * Retrieves the full price-change history of a product (oldest first).
 * Used by the "Historial de precios" card on /products/[id].
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IPriceHistoryRepository } from "@domain/repositories/IPriceHistoryRepository";
import type {
  GetProductPriceHistoryInputDTO,
  GetProductPriceHistoryResultDTO,
} from "@application/dtos/PriceHistoryDTO";
import { PriceHistoryMapper } from "@application/mappers/PriceHistoryMapper";
import { NotFoundException } from "@application/exceptions/ApplicationException";

export class GetProductPriceHistoryUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly priceHistoryRepository: IPriceHistoryRepository,
  ) {}

  async execute(
    dto: GetProductPriceHistoryInputDTO,
  ): Promise<GetProductPriceHistoryResultDTO> {
    const product = await this.productRepository.findById(dto.productId);
    if (!product) {
      throw new NotFoundException("Product", dto.productId);
    }

    const changes = await this.priceHistoryRepository.findByProductId(product.id);
    return { entries: changes.map((c) => PriceHistoryMapper.toDTO(c)) };
  }
}
