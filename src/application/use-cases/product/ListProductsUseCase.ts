/**
 * ListProductsUseCase
 *
 * Returns a filtered list of products.
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import type { ListProductsInputDTO, ProductDTO } from "@application/dtos/ProductDTO";
import { ProductMapper } from "@application/mappers/ProductMapper";

export class ListProductsUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: ICategoryRepository,
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(dto: ListProductsInputDTO = {}): Promise<ProductDTO[]> {
    const products = await this.productRepository.findAll({
      name: dto.name,
      categoryId: dto.categoryId,
      skuContains: dto.skuContains,
      supplierId: dto.supplierId,
      ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
    });

    // Batch-load categories to avoid N+1
    const categoryIds = [...new Set(products.map((p) => p.categoryId).filter(Boolean) as string[])];
    const categories = await Promise.all(
      categoryIds.map((id) => this.categoryRepository.findById(id)),
    );
    const categoryMap = new Map(
      categories.filter(Boolean).map((c) => [c!.id, c!]),
    );

    // Batch-load suppliers to populate supplierName in the DTO
    const supplierIds = [...new Set(products.map((p) => p.supplierId).filter(Boolean) as string[])];
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
