/**
 * AdjustStockUseCase
 *
 * The core use case for modifying stock levels.
 * Handles IN, OUT, and ADJUSTMENT movement types.
 * Records an immutable StockMovement for every change.
 *
 * LAYER: application
 */

import { StockMovement } from "@domain/entities/StockMovement";
import { MovementType } from "@domain/value-objects/MovementType";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import type { AdjustStockInputDTO, StockLevelDTO } from "@application/dtos/StockDTO";
import { StockMapper } from "@application/mappers/StockMapper";
import { NotFoundException } from "@application/exceptions/ApplicationException";

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export class AdjustStockUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly stockRepository: IStockRepository,
  ) {}

  async execute(dto: AdjustStockInputDTO): Promise<StockLevelDTO> {
    const product = await this.productRepository.findById(dto.productId);
    if (!product) {
      throw new NotFoundException("Product", dto.productId);
    }

    const stockLevel = await this.stockRepository.findStockLevelByProductId(dto.productId);
    if (!stockLevel) {
      throw new NotFoundException("StockLevel for product", dto.productId);
    }

    const movementType = MovementType.create(dto.type);

    // Apply movement — domain entity enforces invariants (e.g. no negative stock)
    let updatedLevel = stockLevel;
    if (movementType.isInbound) {
      updatedLevel = stockLevel.addStock(dto.quantity);
    } else if (movementType.isOutbound) {
      updatedLevel = stockLevel.removeStock(dto.quantity);
    } else if (movementType.isAdjustment) {
      updatedLevel = stockLevel.adjustTo(dto.quantity);
    }

    // Build the movement audit record
    const movement = StockMovement.create({
      id: generateId(),
      productId: dto.productId,
      type: movementType,
      quantity: dto.quantity,
      reason: dto.reason ?? null,
      reference: dto.reference ?? null,
      createdAt: new Date(),
    });

    // Atomic write: the audit record + the new level either both commit or both
    // roll back. Required by the registerMovement Server Action contract.
    const { stockLevel: savedLevel } = await this.stockRepository.applyMovement(
      updatedLevel,
      movement,
    );

    return StockMapper.stockLevelToDTO(savedLevel, product.name, product.sku.value);
  }
}
