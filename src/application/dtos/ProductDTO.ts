/**
 * Product DTOs
 *
 * Input/output contracts for product-related use cases.
 * Use cases always return DTOs — never raw domain entities.
 *
 * LAYER: application
 */

export interface ProductDTO {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  price: number;
  currency: string;
  categoryId: string | null;
  categoryName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  /** ISO 8601 timestamp when the product was soft-deleted, or null if active. */
  deletedAt: string | null;
}

export interface CreateProductInputDTO {
  name: string;
  description?: string;
  sku: string;
  price: number;
  currency?: string;
  categoryId?: string;
  supplierId?: string | null;
  /** Initial stock quantity to seed the StockLevel with (default 0). Must be >= 0. */
  stockInicial?: number;
}

export interface UpdateProductInputDTO {
  id: string;
  name?: string;
  description?: string | null;
  price?: number;
  currency?: string;
  categoryId?: string | null;
  supplierId?: string | null;
}

export interface DeleteProductInputDTO {
  id: string;
}

export interface DeleteProductsBulkInputDTO {
  skus: string[];
}

export interface DeleteProductsBulkResultDTO {
  deletedCount: number;
}

export interface GetProductInputDTO {
  id: string;
}

export interface ListProductsInputDTO {
  name?: string;
  categoryId?: string;
  skuContains?: string;
  supplierId?: string;
}
