"use client";

import { useCallback, useState } from "react";
import { ExportProductsButton } from "@/components/products/ExportProductsButton";
import { NewProductDialog } from "@/components/products/NewProductDialog";
import { ProductsFilters } from "@/components/products/ProductsFilters";
import type { ProductDTO } from "@application/dtos/ProductDTO";

interface ProductsCatalogProps {
  products: ProductDTO[];
  categories: Array<{ id: string; name: string }>;
  stockByProductId?: Record<string, number>;
}

export function ProductsCatalog({
  products,
  categories,
  stockByProductId = {},
}: ProductsCatalogProps) {
  const [filtered, setFiltered] = useState<ProductDTO[]>(products);

  const handleFilteredChange = useCallback((next: ProductDTO[]) => {
    setFiltered(next);
  }, []);

  return (
    <div className="space-y-6">
      <div
        className="flex items-center justify-between"
        data-testid="products-header"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportProductsButton
            products={filtered}
            stockByProductId={stockByProductId}
          />
          <NewProductDialog categories={categories} />
        </div>
      </div>

      <ProductsFilters
        products={products}
        categories={categories}
        stockByProductId={stockByProductId}
        onFilteredChange={handleFilteredChange}
      />
    </div>
  );
}
