"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeleteProductButton } from "@/components/products/DeleteProductButton";
import { EditProductDialog } from "@/components/products/EditProductDialog";
import { RegisterMovementDialog } from "@/components/stock/RegisterMovementDialog";
import type { ProductDTO } from "@application/dtos/ProductDTO";

export type ProductSortField = "name" | "price" | "stock";
export type ProductSortDirection = "asc" | "desc";
export interface ProductSortState {
  field: ProductSortField;
  direction: ProductSortDirection;
}

interface ProductsTableProps {
  products: ProductDTO[];
  /** Map of productId → current stock quantity, used to render the Stock column. */
  stockByProductId?: Record<string, number>;
  /** Map of productId → count of stock movements, used by DeleteProductButton's confirmation message. */
  movementCountByProductId?: Record<string, number>;
  /** Category options for the inline EditProductDialog. */
  categories?: Array<{ id: string; name: string }>;
  /** Supplier options for the inline EditProductDialog. */
  suppliers?: Array<{ id: string; name: string }>;
  /**
   * T27 — current sort, parsed from `?sort=` upstream. When set, the matching
   * header renders a chevron-up (asc) / chevron-down (desc) indicator.
   */
  initialSort?: ProductSortState | undefined;
  /**
   * Selection state — when all three of selectedSkus / onToggleOne / onToggleAll
   * are provided, the table renders an extra leftmost checkbox column.
   */
  selectedSkus?: Set<string>;
  onToggleOne?: (sku: string) => void;
  onToggleAll?: (visibleSkus: string[]) => void;
}

/**
 * T27 — cycle the sort state for the clicked column.
 *   none/other column → asc on the clicked column (resets the prior column)
 *   asc on same column → desc on same column
 *   desc on same column → none (no sort)
 */
export function cycleSort(
  current: ProductSortState | null,
  clicked: ProductSortField,
): ProductSortState | null {
  if (!current || current.field !== clicked) {
    return { field: clicked, direction: "asc" };
  }
  if (current.direction === "asc") return { field: clicked, direction: "desc" };
  return null;
}

export function buildSortUrl(
  baseParams: URLSearchParams,
  next: ProductSortState | null,
): string {
  const params = new URLSearchParams(baseParams.toString());
  params.delete("sort");
  if (next) params.set("sort", `${next.field}:${next.direction}`);
  const qs = params.toString();
  return qs.length > 0 ? `/products?${qs}` : "/products";
}

export function ProductsTable({
  products,
  stockByProductId = {},
  movementCountByProductId = {},
  categories = [],
  suppliers = [],
  initialSort,
  selectedSkus,
  onToggleOne,
  onToggleAll,
}: ProductsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const currentSort: ProductSortState | null = initialSort ?? null;

  function handleSortClick(field: ProductSortField) {
    const next = cycleSort(currentSort, field);
    const base = searchParams ?? new URLSearchParams();
    router.push(buildSortUrl(base, next));
  }

  function renderSortHeader(
    field: ProductSortField,
    label: string,
    alignClass: string,
  ) {
    const active = currentSort?.field === field;
    const direction = active ? currentSort!.direction : null;
    return (
      <th
        scope="col"
        className={`px-4 py-3 font-medium ${alignClass}`}
        aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
      >
        <button
          type="button"
          onClick={() => handleSortClick(field)}
          data-testid={`sort-header-${field}`}
          data-sort-direction={active ? direction : "none"}
          data-active={active ? "true" : "false"}
          className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
            alignClass.includes("text-right") ? "justify-end" : ""
          } ${active ? "text-foreground font-semibold" : "text-muted-foreground"}`}
        >
          <span>{label}</span>
          {active && direction === "asc" && (
            <ChevronUp
              data-testid={`sort-chevron-up-${field}`}
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
          )}
          {active && direction === "desc" && (
            <ChevronDown
              data-testid={`sort-chevron-down-${field}`}
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
          )}
        </button>
      </th>
    );
  }

  const selectionEnabled =
    !!selectedSkus && !!onToggleOne && !!onToggleAll;

  const visibleSkus = products.map((p) => p.sku);
  const selectedCount = selectionEnabled
    ? visibleSkus.filter((s) => selectedSkus!.has(s)).length
    : 0;
  const allSelected =
    selectionEnabled && visibleSkus.length > 0 && selectedCount === visibleSkus.length;
  const someSelected =
    selectionEnabled && selectedCount > 0 && selectedCount < visibleSkus.length;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  if (products.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium">No products found</p>
        <p className="text-sm mt-1">Add your first product to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            {selectionEnabled && (
              <th
                className="w-10 px-3 py-3 text-left font-medium"
                data-testid="select-header-cell"
              >
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  data-testid="select-all-checkbox"
                  aria-label="Seleccionar todos los productos visibles"
                  checked={allSelected}
                  onChange={() => onToggleAll!(visibleSkus)}
                  className="h-4 w-4 cursor-pointer accent-primary"
                />
              </th>
            )}
            {renderSortHeader("name", "Nombre", "text-left")}
            <th className="px-4 py-3 text-left font-medium">SKU</th>
            <th className="px-4 py-3 text-left font-medium">Category</th>
            <th className="px-4 py-3 text-left font-medium">Proveedor</th>
            {renderSortHeader("stock", "Stock", "text-right")}
            {renderSortHeader("price", "Precio", "text-right")}
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {products.map((product) => {
            const href = `/products/${encodeURIComponent(product.id)}`;
            const isSelected =
              selectionEnabled && selectedSkus!.has(product.sku);
            return (
              <tr
                key={product.id}
                data-testid="product-row"
                data-product-id={product.id}
                data-product-sku={product.sku}
                data-selected={isSelected ? "true" : undefined}
                role="link"
                tabIndex={0}
                onClick={() => router.push(href)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(href);
                  }
                }}
                className={`hover:bg-muted/30 cursor-pointer transition-colors focus:bg-muted/40 focus:outline-none ${
                  isSelected ? "bg-muted/40" : ""
                }`}
              >
                {selectionEnabled && (
                  <td
                    className="w-10 px-3 py-3"
                    data-testid="row-select-cell"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      data-testid={`select-row-${product.sku}`}
                      aria-label={`Seleccionar ${product.name}`}
                      checked={isSelected}
                      onChange={() => onToggleOne!(product.sku)}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    {product.description && (
                      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                        {product.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                    {product.sku}
                  </code>
                </td>
                <td className="px-4 py-3">
                  {product.categoryName ? (
                    <Badge variant="secondary">{product.categoryName}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3" data-testid="supplier-cell">
                  {product.supplierName ? (
                    product.supplierName
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td
                  className="px-4 py-3 text-right font-mono tabular-nums"
                  data-testid="stock-cell"
                >
                  {stockByProductId[product.id] ?? 0}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {product.currency} {product.price.toFixed(2)}
                </td>
                <td
                  className="px-4 py-3 text-right"
                  data-testid="row-actions-cell"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={href}
                      data-testid={`view-detail-link-${product.id}`}
                      className="text-primary hover:text-primary/80 text-xs font-medium underline-offset-4 hover:underline mr-1"
                    >
                      Ver detalle
                    </Link>
                    <RegisterMovementDialog
                      productId={product.id}
                      productName={product.name}
                      productSku={product.sku}
                      tipo="ENTRADA"
                    />
                    <RegisterMovementDialog
                      productId={product.id}
                      productName={product.name}
                      productSku={product.sku}
                      tipo="SALIDA"
                    />
                    <EditProductDialog
                      product={product}
                      currentStock={stockByProductId[product.id] ?? 0}
                      categories={categories}
                      suppliers={suppliers}
                    />
                    <DeleteProductButton
                      productId={product.id}
                      productName={product.name}
                      productSku={product.sku}
                      movementCount={movementCountByProductId[product.id] ?? 0}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
