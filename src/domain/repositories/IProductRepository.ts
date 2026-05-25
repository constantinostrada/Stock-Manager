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

export interface ProductFilters {
  name?: string;
  categoryId?: string;
  skuContains?: string;
}

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  findAll(filters?: ProductFilters): Promise<Product[]>;
  save(product: Product): Promise<Product>;
  update(product: Product): Promise<Product>;
  delete(id: string): Promise<void>;
  existsBySku(sku: string, excludeId?: string): Promise<boolean>;
}
