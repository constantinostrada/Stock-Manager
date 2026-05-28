/**
 * RegisterStockMovementUseCase
 *
 * Registers a stock movement (IN or OUT) atomically:
 * persists the StockMovement audit record AND updates the
 * product's stock level in a single transaction.
 *
 * Out-of-stock attempts surface as InsufficientStockError
 * (thrown by StockLevel.removeStock).
 *
 * For absolute-value adjustments (ADJUSTMENT), use AdjustStockUseCase.
 *
 * LAYER: application
 */

import { StockMovement } from "@domain/entities/StockMovement";
import { MovementType } from "@domain/value-objects/MovementType";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import type { StockLevelDTO } from "@application/dtos/StockDTO";
import { StockMapper } from "@application/mappers/StockMapper";
import { NotFoundException } from "@application/exceptions/ApplicationException";

export interface RegisterStockMovementInputDTO {
  productId: string;
  type: "IN" | "OUT";
  quantity: number;
  reason?: string | null;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export class RegisterStockMovementUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly stockRepository: IStockRepository,
  ) {}

  async execute(dto: RegisterStockMovementInputDTO): Promise<StockLevelDTO> {
    const product = await this.productRepository.findById(dto.productId);
    if (!product) {
      throw new NotFoundException("Product", dto.productId);
    }

    const stockLevel = await this.stockRepository.findStockLevelByProductId(dto.productId);
    if (!stockLevel) {
      throw new NotFoundException("StockLevel for product", dto.productId);
    }

    const movementType = MovementType.create(dto.type);

    const updatedLevel = movementType.isInbound
      ? stockLevel.addStock(dto.quantity)
      : stockLevel.removeStock(dto.quantity);

    const movement = StockMovement.create({
      id: generateId(),
      productId: dto.productId,
      type: movementType,
      quantity: dto.quantity,
      reason: dto.reason ?? null,
      reference: null,
      createdAt: new Date(),
    });

    const { stockLevel: savedLevel } = await this.stockRepository.applyMovement(
      updatedLevel,
      movement,
    );

    return StockMapper.stockLevelToDTO(savedLevel, product.name, product.sku.value);
  }
}
