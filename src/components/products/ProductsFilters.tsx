"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductsTable } from "@/components/products/ProductsTable";
import type { ProductDTO } from "@application/dtos/ProductDTO";

export type StockLevelFilter = "all" | "in" | "low" | "out";

interface ProductsFiltersProps {
  products: ProductDTO[];
  categories: Array<{ id: string; name: string }>;
  stockByProductId?: Record<string, number>;
  onFilteredChange?: (filtered: ProductDTO[]) => void;
}

const DEFAULT_SEARCH = "";
const DEFAULT_CATEGORY_ID = "";
const DEFAULT_STOCK_LEVEL: StockLevelFilter = "all";

function matchesStockLevel(qty: number, level: StockLevelFilter): boolean {
  switch (level) {
    case "all":
      return true;
    case "in":
      return qty >= 10;
    case "low":
      return qty > 0 && qty < 10;
    case "out":
      return qty === 0;
  }
}

export function ProductsFilters({
  products,
  categories,
  stockByProductId = {},
  onFilteredChange,
}: ProductsFiltersProps) {
  const [search, setSearch] = useState<string>(DEFAULT_SEARCH);
  const [categoryId, setCategoryId] = useState<string>(DEFAULT_CATEGORY_ID);
  const [stockLevel, setStockLevel] =
    useState<StockLevelFilter>(DEFAULT_STOCK_LEVEL);

  const total = products.length;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((p) => {
      if (needle.length > 0) {
        const haystack = `${p.sku} ${p.name}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (categoryId && p.categoryId !== categoryId) return false;
      const qty = stockByProductId[p.id] ?? 0;
      if (!matchesStockLevel(qty, stockLevel)) return false;
      return true;
    });
  }, [products, search, categoryId, stockLevel, stockByProductId]);

  useEffect(() => {
    onFilteredChange?.(filtered);
  }, [filtered, onFilteredChange]);

  const searchActive = search.trim().length > 0;
  const categoryActive = categoryId !== DEFAULT_CATEGORY_ID;
  const stockActive = stockLevel !== DEFAULT_STOCK_LEVEL;
  const anyActive = searchActive || categoryActive || stockActive;

  function clearAll() {
    setSearch(DEFAULT_SEARCH);
    setCategoryId(DEFAULT_CATEGORY_ID);
    setStockLevel(DEFAULT_STOCK_LEVEL);
  }

  return (
    <div className="space-y-4" data-testid="products-filters">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por SKU o nombre…"
            aria-label="Buscar por SKU o nombre"
            data-testid="search-input"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 pl-8 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
          />
          {searchActive && (
            <button
              type="button"
              onClick={() => setSearch(DEFAULT_SEARCH)}
              aria-label="Limpiar búsqueda"
              data-testid="clear-search"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 inline-flex items-center gap-1 text-xs"
            >
              <X className="h-3 w-3" />
              Limpiar
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label="Filtrar por categoría"
            data-testid="category-filter"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {categoryActive && (
            <button
              type="button"
              onClick={() => setCategoryId(DEFAULT_CATEGORY_ID)}
              aria-label="Limpiar categoría"
              data-testid="clear-category"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
            >
              <X className="h-3 w-3" />
              Limpiar
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <select
            value={stockLevel}
            onChange={(e) =>
              setStockLevel(e.target.value as StockLevelFilter)
            }
            aria-label="Filtrar por nivel de stock"
            data-testid="stock-level-filter"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
          >
            <option value="all">Todos</option>
            <option value="in">En stock</option>
            <option value="low">Bajo stock (&lt; 10)</option>
            <option value="out">Sin stock (= 0)</option>
          </select>
          {stockActive && (
            <button
              type="button"
              onClick={() => setStockLevel(DEFAULT_STOCK_LEVEL)}
              aria-label="Limpiar nivel de stock"
              data-testid="clear-stock-level"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
            >
              <X className="h-3 w-3" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      <p
        className="text-muted-foreground text-sm"
        data-testid="results-counter"
      >
        Mostrando {filtered.length} de {total} productos
      </p>

      {filtered.length === 0 ? (
        <div
          className="text-muted-foreground rounded-lg border border-dashed p-12 text-center"
          data-testid="filters-empty-state"
        >
          <p className="text-lg font-medium">
            Ningún producto coincide con los filtros
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAll}
            disabled={!anyActive}
            data-testid="clear-all-filters"
            className="mt-4"
          >
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <ProductsTable
          products={filtered}
          stockByProductId={stockByProductId}
          categories={categories}
        />
      )}
    </div>
  );
}
