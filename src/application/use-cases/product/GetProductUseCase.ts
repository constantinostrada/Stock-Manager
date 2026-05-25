/**
 * GetProductUseCase
 *
 * Retrieves a single product by ID.
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { GetProductInputDTO, ProductDTO } from "@application/dtos/ProductDTO";
import { ProductMapper } from "@application/mappers/ProductMapper";
import { NotFoundException } from "@application/exceptions/ApplicationException";

export class GetProductUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(dto: GetProductInputDTO): Promise<ProductDTO> {
    const product = await this.productRepository.findById(dto.id);
    if (!product) {
      throw new NotFoundException("Product", dto.id);
    }

    const category = product.categoryId
      ? await this.categoryRepository.findById(product.categoryId)
      : null;

    return ProductMapper.toDTO(product, category);
  }
}
