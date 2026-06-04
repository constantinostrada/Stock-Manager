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

/**
 * One raw row from an uploaded products CSV. All cells arrive as strings —
 * the import use case is responsible for coercing/validating them so it can
 * report per-row errors instead of rejecting the whole file.
 */
export interface ImportProductRowInputDTO {
  /** 1-based line number in the original file (header is row 1). */
  rowNumber: number;
  name: string;
  sku: string;
  price: string;
  categoryName: string;
  supplierName: string;
  stock: string;
  minStock: string;
}

export interface ImportProductsInputDTO {
  rows: ImportProductRowInputDTO[];
  /** When true, validate only — nothing is written. Used by the preview. */
  dryRun?: boolean;
}

export interface ImportProductRowResultDTO extends ImportProductRowInputDTO {
  valid: boolean;
  /** Human-readable validation errors. Empty when `valid` is true. */
  errors: string[];
}

export interface ImportProductsResultDTO {
  rows: ImportProductRowResultDTO[];
  validCount: number;
  errorCount: number;
  /** Number of products actually persisted (always 0 on dry runs). */
  createdCount: number;
}

export interface ListProductsInputDTO {
  name?: string;
  categoryId?: string;
  skuContains?: string;
  supplierId?: string;
  /** T27 — sort: server-side ORDER BY. */
  sort?: {
    field: "name" | "price" | "stock";
    direction: "asc" | "desc";
  };
}
