/**
 * ListDeletedProductsUseCase
 *
 * Returns every soft-deleted product (deletedAt IS NOT NULL), ordered by
 * deletedAt DESC. Powers the /products/trash page.
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import type { ProductDTO } from "@application/dtos/ProductDTO";
import { ProductMapper } from "@application/mappers/ProductMapper";

export class ListDeletedProductsUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: ICategoryRepository,
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(): Promise<ProductDTO[]> {
    const products = await this.productRepository.findAllDeleted();

    const categoryIds = [
      ...new Set(products.map((p) => p.categoryId).filter(Boolean) as string[]),
    ];
    const categories = await Promise.all(
      categoryIds.map((id) => this.categoryRepository.findById(id)),
    );
    const categoryMap = new Map(
      categories.filter(Boolean).map((c) => [c!.id, c!]),
    );

    const supplierIds = [
      ...new Set(products.map((p) => p.supplierId).filter(Boolean) as string[]),
    ];
    const suppliers = await Promise.all(
      supplierIds.map((id) => this.supplierRepository.findById(id)),
    );
    const supplierMap = new Map(
      suppliers.filter(Boolean).map((s) => [s!.id, s!]),
    );

    return products.map((product) =>
      ProductMapper.toDTO(
        product,
        product.categoryId ? (categoryMap.get(product.categoryId) ?? null) : null,
        product.supplierId ? (supplierMap.get(product.supplierId) ?? null) : null,
      ),
    );
  }
}
