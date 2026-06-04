/**
 * UpdateProductUseCase
 *
 * Updates an existing product's metadata (not stock levels).
 * Records an immutable PriceChange audit entry whenever the price
 * actually changes (T4 — price history lives in this layer, not the UI).
 *
 * LAYER: application
 */

import { Money } from "@domain/value-objects/Money";
import { PriceChange } from "@domain/entities/PriceChange";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import type { IPriceHistoryRepository } from "@domain/repositories/IPriceHistoryRepository";
import type { UpdateProductInputDTO, ProductDTO } from "@application/dtos/ProductDTO";
import { ProductMapper } from "@application/mappers/ProductMapper";
import { NotFoundException } from "@application/exceptions/ApplicationException";

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export class UpdateProductUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: ICategoryRepository,
    private readonly supplierRepository: ISupplierRepository,
    private readonly priceHistoryRepository: IPriceHistoryRepository,
  ) {}

  async execute(dto: UpdateProductInputDTO): Promise<ProductDTO> {
    const product = await this.productRepository.findById(dto.id);
    if (!product) {
      throw new NotFoundException("Product", dto.id);
    }

    let category = null;
    const targetCategoryId = dto.categoryId !== undefined ? dto.categoryId : product.categoryId;
    if (targetCategoryId) {
      category = await this.categoryRepository.findById(targetCategoryId);
      if (!category) {
        throw new NotFoundException("Category", targetCategoryId);
      }
    }

    let supplier = null;
    const targetSupplierId = dto.supplierId !== undefined ? dto.supplierId : product.supplierId;
    if (targetSupplierId) {
      supplier = await this.supplierRepository.findById(targetSupplierId);
      if (!supplier) {
        throw new NotFoundException("Supplier", targetSupplierId);
      }
    }

    const updatedPrice =
      dto.price !== undefined
        ? Money.create(dto.price, dto.currency ?? product.price.currency)
        : undefined;

    // Only pass fields that were actually provided — an explicit `undefined`
    // would override the current value inside Product.update's spread.
    const updated = product.update({
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(updatedPrice !== undefined && { price: updatedPrice }),
      ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
      ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
    });

    const saved = await this.productRepository.update(updated);

    // Record exactly one history entry, and only when the price amount
    // actually changed — edits to other fields must not create entries.
    const priceChanged =
      updatedPrice !== undefined && updatedPrice.amount !== product.price.amount;
    if (priceChanged) {
      await this.priceHistoryRepository.save(
        PriceChange.create({
          id: generateId(),
          productId: product.id,
          oldPrice: product.price.amount,
          newPrice: updatedPrice.amount,
          changedAt: new Date(),
        }),
      );
    }

    return ProductMapper.toDTO(saved, category, supplier);
  }
}
