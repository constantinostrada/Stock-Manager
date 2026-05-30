"use client";

import { useCallback, useState } from "react";
import { BulkDeleteBar } from "@/components/products/BulkDeleteBar";
import { ExportProductsButton } from "@/components/products/ExportProductsButton";
import { NewProductDialog } from "@/components/products/NewProductDialog";
import { ProductsFilters } from "@/components/products/ProductsFilters";
import type { ProductDTO } from "@application/dtos/ProductDTO";

interface ProductsCatalogProps {
  products: ProductDTO[];
  categories: Array<{ id: string; name: string }>;
  suppliers?: Array<{ id: string; name: string }>;
  stockByProductId?: Record<string, number>;
  movementCountByProductId?: Record<string, number>;
  initialSearch?: string | undefined;
  initialSupplierId?: string | undefined;
  /** T27 — current sort, parsed from `?sort=` in the URL. */
  initialSort?:
    | { field: "name" | "price" | "stock"; direction: "asc" | "desc" }
    | undefined;
}

export function ProductsCatalog({
  products,
  categories,
  suppliers = [],
  stockByProductId = {},
  movementCountByProductId = {},
  initialSearch,
  initialSupplierId,
  initialSort,
}: ProductsCatalogProps) {
  const [filtered, setFiltered] = useState<ProductDTO[]>(products);
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(
    () => new Set<string>(),
  );

  const handleFilteredChange = useCallback((next: ProductDTO[]) => {
    setFiltered(next);
  }, []);

  const handleToggleOne = useCallback((sku: string) => {
    setSelectedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback((visibleSkus: string[]) => {
    setSelectedSkus((prev) => {
      const allSelected =
        visibleSkus.length > 0 && visibleSkus.every((s) => prev.has(s));
      const next = new Set(prev);
      if (allSelected) {
        for (const sku of visibleSkus) next.delete(sku);
      } else {
        for (const sku of visibleSkus) next.add(sku);
      }
      return next;
    });
  }, []);

  const handleClear = useCallback(() => {
    setSelectedSkus(new Set<string>());
  }, []);

  return (
    <div className="space-y-6 pb-24">
      <div
        className="flex items-center justify-between"
        data-testid="products-header"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportProductsButton />
          <NewProductDialog categories={categories} suppliers={suppliers} />
        </div>
      </div>

      <ProductsFilters
        products={products}
        categories={categories}
        suppliers={suppliers}
        stockByProductId={stockByProductId}
        movementCountByProductId={movementCountByProductId}
        initialSearch={initialSearch}
        {...(initialSupplierId !== undefined ? { initialSupplierId } : {})}
        {...(initialSort !== undefined ? { initialSort } : {})}
        onFilteredChange={handleFilteredChange}
        selectedSkus={selectedSkus}
        onToggleOne={handleToggleOne}
        onToggleAll={handleToggleAll}
      />

      <BulkDeleteBar
        selectedSkus={Array.from(selectedSkus)}
        onClear={handleClear}
      />
    </div>
  );
}
