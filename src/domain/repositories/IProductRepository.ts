/**
 * IProductRepository
 *
 * Repository interface for the Product aggregate.
 * Describes WHAT operations are available — not HOW they are performed.
 * The implementation lives in infrastructure/.
 *
 * LAYER: domain — zero external imports allowed.
 */

import type { Product } from "@domain/entities/Product";

export type ProductSortField = "name" | "price" | "stock";
export type ProductSortDirection = "asc" | "desc";
export interface ProductSort {
  field: ProductSortField;
  direction: ProductSortDirection;
}

export interface ProductFilters {
  name?: string;
  categoryId?: string;
  skuContains?: string;
  supplierId?: string;
  sort?: ProductSort;
}

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  findAll(filters?: ProductFilters): Promise<Product[]>;
  save(product: Product): Promise<Product>;
  update(product: Product): Promise<Product>;
  delete(id: string): Promise<void>;
  /**
   * Deletes every product whose SKU is in `skus` inside a single transaction.
   * If any of the requested SKUs is not found, the whole batch is rolled back
   * and a NotFoundException is raised. Returns the count of deleted rows.
   */
  deleteManyBySkus(skus: string[]): Promise<number>;
  /**
   * Stamps `deletedAt = now()` on the row. Does NOT touch stock movements or
   * stock levels — soft-delete preserves the historical audit trail.
   */
  softDelete(id: string): Promise<void>;
  existsBySku(sku: string, excludeId?: string): Promise<boolean>;
}
