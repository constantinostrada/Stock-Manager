/**
 * ProductMapper
 *
 * Maps between Product domain entities and ProductDTOs.
 * Keeps domain internals (value objects) out of the presentation layer.
 *
 * LAYER: application
 */

import type { Product } from "@domain/entities/Product";
import type { Category } from "@domain/entities/Category";
import type { Supplier } from "@domain/entities/Supplier";
import type { ProductDTO } from "@application/dtos/ProductDTO";

export class ProductMapper {
  static toDTO(
    product: Product,
    category?: Category | null,
    supplier?: Supplier | null,
  ): ProductDTO {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku.value,
      price: product.price.amount,
      currency: product.price.currency,
      categoryId: product.categoryId,
      categoryName: category?.name ?? null,
      supplierId: product.supplierId,
      supplierName: supplier?.name ?? null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      deletedAt: product.deletedAt ? product.deletedAt.toISOString() : null,
    };
  }
}
