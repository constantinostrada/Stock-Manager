/**
 * UpdateProductUseCase
 *
 * Updates an existing product's metadata (not stock levels).
 *
 * LAYER: application
 */

import { Money } from "@domain/value-objects/Money";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { UpdateProductInputDTO, ProductDTO } from "@application/dtos/ProductDTO";
import { ProductMapper } from "@application/mappers/ProductMapper";
import { NotFoundException } from "@application/exceptions/ApplicationException";

export class UpdateProductUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: ICategoryRepository,
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

    const updatedPrice =
      dto.price !== undefined
        ? Money.create(dto.price, dto.currency ?? product.price.currency)
        : undefined;

    const updated = product.update({
      name: dto.name,
      description: dto.description,
      price: updatedPrice,
      categoryId: dto.categoryId,
    });

    const saved = await this.productRepository.update(updated);
    return ProductMapper.toDTO(saved, category);
  }
}
