/**
 * ListStockMovementsUseCase
 *
 * Returns the movement history, optionally filtered by product or date range.
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import type { ListStockMovementsInputDTO, StockMovementDTO } from "@application/dtos/StockDTO";
import { StockMapper } from "@application/mappers/StockMapper";

export class ListStockMovementsUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly stockRepository: IStockRepository,
  ) {}

  async execute(dto: ListStockMovementsInputDTO = {}): Promise<StockMovementDTO[]> {
    const movements = await this.stockRepository.findMovements({
      productId: dto.productId,
      type: dto.type,
      fromDate: dto.fromDate ? new Date(dto.fromDate) : undefined,
      toDate: dto.toDate ? new Date(dto.toDate) : undefined,
    });

    // Batch-load product names
    const productIds = [...new Set(movements.map((m) => m.productId))];
    const products = await Promise.all(
      productIds.map((id) => this.productRepository.findById(id)),
    );
    const productMap = new Map(products.filter(Boolean).map((p) => [p!.id, p!]));

    return movements.map((movement) => {
      const product = productMap.get(movement.productId);
      return StockMapper.movementToDTO(movement, product?.name ?? "Unknown");
    });
  }
}
