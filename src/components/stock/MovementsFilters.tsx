"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MovementsHistoryTable } from "@/components/stock/MovementsHistoryTable";
import type { StockMovementDTO } from "@application/dtos/StockDTO";

export type MovementTypeFilter = "all" | "in" | "out";

interface MovementsFiltersProps {
  movements: StockMovementDTO[];
  products: Array<{ id: string; name: string; sku: string }>;
  productSkuById?: Record<string, string>;
}

const DEFAULT_SEARCH = "";
const DEFAULT_TYPE: MovementTypeFilter = "all";
const DEFAULT_PRODUCT_ID = "";

const TYPE_FILTER_TO_DTO: Record<MovementTypeFilter, string | null> = {
  all: null,
  in: "IN",
  out: "OUT",
};

export function MovementsFilters({
  movements,
  products,
  productSkuById = {},
}: MovementsFiltersProps) {
  const [search, setSearch] = useState<string>(DEFAULT_SEARCH);
  const [type, setType] = useState<MovementTypeFilter>(DEFAULT_TYPE);
  const [productId, setProductId] = useState<string>(DEFAULT_PRODUCT_ID);

  const total = movements.length;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const expectedType = TYPE_FILTER_TO_DTO[type];
    return movements.filter((m) => {
      if (needle.length > 0) {
        const haystack = (m.reason ?? "").toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (expectedType !== null && m.type !== expectedType) return false;
      if (productId && m.productId !== productId) return false;
      return true;
    });
  }, [movements, search, type, productId]);

  const searchActive = search.trim().length > 0;
  const typeActive = type !== DEFAULT_TYPE;
  const productActive = productId !== DEFAULT_PRODUCT_ID;
  const anyActive = searchActive || typeActive || productActive;

  function clearAll() {
    setSearch(DEFAULT_SEARCH);
    setType(DEFAULT_TYPE);
    setProductId(DEFAULT_PRODUCT_ID);
  }

  return (
    <div className="space-y-4" data-testid="movements-filters">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por razón…"
            aria-label="Buscar por razón"
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
            value={type}
            onChange={(e) => setType(e.target.value as MovementTypeFilter)}
            aria-label="Filtrar por tipo de movimiento"
            data-testid="type-filter"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
          >
            <option value="all">Todos</option>
            <option value="in">Solo entradas</option>
            <option value="out">Solo salidas</option>
          </select>
          {typeActive && (
            <button
              type="button"
              onClick={() => setType(DEFAULT_TYPE)}
              aria-label="Limpiar tipo"
              data-testid="clear-type"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
            >
              <X className="h-3 w-3" />
              Limpiar
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            aria-label="Filtrar por producto"
            data-testid="product-filter"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
          >
            <option value="">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
          {productActive && (
            <button
              type="button"
              onClick={() => setProductId(DEFAULT_PRODUCT_ID)}
              aria-label="Limpiar producto"
              data-testid="clear-product"
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
        Mostrando {filtered.length} de {total} movimientos
      </p>

      {filtered.length === 0 ? (
        <div
          className="text-muted-foreground rounded-lg border border-dashed p-12 text-center"
          data-testid="filters-empty-state"
        >
          <p className="text-lg font-medium">
            Ningún movimiento coincide con los filtros
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
        <MovementsHistoryTable
          movements={filtered}
          productSkuById={productSkuById}
        />
      )}
    </div>
  );
}
