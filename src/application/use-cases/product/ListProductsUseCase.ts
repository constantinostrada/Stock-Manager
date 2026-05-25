/**
 * ListProductsUseCase
 *
 * Returns a filtered list of products.
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { ListProductsInputDTO, ProductDTO } from "@application/dtos/ProductDTO";
import { ProductMapper } from "@application/mappers/ProductMapper";

export class ListProductsUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(dto: ListProductsInputDTO = {}): Promise<ProductDTO[]> {
    const products = await this.productRepository.findAll({
      name: dto.name,
      categoryId: dto.categoryId,
      skuContains: dto.skuContains,
    });

    // Batch-load categories to avoid N+1
    const categoryIds = [...new Set(products.map((p) => p.categoryId).filter(Boolean) as string[])];
    const categories = await Promise.all(
      categoryIds.map((id) => this.categoryRepository.findById(id)),
    );
    const categoryMap = new Map(
      categories.filter(Boolean).map((c) => [c!.id, c!]),
    );

    return products.map((product) =>
      ProductMapper.toDTO(product, product.categoryId ? (categoryMap.get(product.categoryId) ?? null) : null),
    );
  }
}
