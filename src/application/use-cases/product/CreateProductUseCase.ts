/**
 * CreateProductUseCase
 *
 * Creates a new product in the system.
 * Validates SKU uniqueness and delegates invariant checks to the domain.
 *
 * LAYER: application
 */

import { Product } from "@domain/entities/Product";
import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";
import { StockLevel } from "@domain/entities/StockLevel";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { CreateProductInputDTO, ProductDTO } from "@application/dtos/ProductDTO";
import { ProductMapper } from "@application/mappers/ProductMapper";
import { ConflictException, NotFoundException } from "@application/exceptions/ApplicationException";

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export class CreateProductUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly stockRepository: IStockRepository,
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(dto: CreateProductInputDTO): Promise<ProductDTO> {
    const sku = SKU.create(dto.sku);
    const skuExists = await this.productRepository.existsBySku(sku.value);
    if (skuExists) {
      throw new ConflictException(`A product with SKU "${sku.value}" already exists.`);
    }

    let category = null;
    if (dto.categoryId) {
      category = await this.categoryRepository.findById(dto.categoryId);
      if (!category) {
        throw new NotFoundException("Category", dto.categoryId);
      }
    }

    const now = new Date();
    const product = Product.create({
      id: generateId(),
      name: dto.name,
      description: dto.description ?? null,
      sku,
      price: Money.create(dto.price, dto.currency ?? "USD"),
      categoryId: dto.categoryId ?? null,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await this.productRepository.save(product);

    // Initialise stock level at zero
    const stockLevel = StockLevel.create({
      id: generateId(),
      productId: saved.id,
      quantity: 0,
      minQuantity: 0,
      updatedAt: now,
    });
    await this.stockRepository.saveStockLevel(stockLevel);

    return ProductMapper.toDTO(saved, category);
  }
}
