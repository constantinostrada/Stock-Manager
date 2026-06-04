/**
 * Product Detail Page (/products/[id])
 *
 * T25 — Server Component that fetches a product by id together with a paginated
 * slice of its movement history. Shows nombre, precio, stock actual, proveedor
 * asociado + tabla paginada de movements (DESC). Returns notFound() when the id
 * does not exist.
 *
 * LAYER: interfaces (Next.js App Router page)
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MovementsHistoryTable } from "@/components/stock/MovementsHistoryTable";
import { PriceHistoryCard } from "@/components/products/PriceHistoryCard";
import {
  getProductWithMovements,
  getProductPriceHistory,
} from "@interfaces/actions/productActions";
import { LOW_STOCK_THRESHOLD } from "@interfaces/dashboard/constants";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ page?: string; limit?: string }>;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

const MONEY_FORMATTER = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DEFAULT_LIMIT = 10;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductDetailPageProps) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const page = parsePositiveInt(sp.page, 1);
  const limit = parsePositiveInt(sp.limit, DEFAULT_LIMIT);

  const result = await getProductWithMovements(id, page, limit);
  if (!result.success) return notFound();

  const priceHistoryResult = await getProductPriceHistory(id);
  const priceHistory = priceHistoryResult.success
    ? priceHistoryResult.data.entries
    : [];

  const { product, stockLevel, movements, total_movements } = result.data;
  const stockActual = stockLevel?.quantity ?? 0;
  const isLowStock = stockActual < LOW_STOCK_THRESHOLD;
  const isDeleted = product.deletedAt != null;
  const totalPages = Math.max(1, Math.ceil(total_movements / limit));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const buildHref = (p: number) =>
    `/products/${encodeURIComponent(product.id)}?page=${p}&limit=${limit}`;

  return (
    <div className="space-y-6" data-testid="product-detail-page">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/products" data-testid="back-to-catalog">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver al catálogo
          </Link>
        </Button>
      </div>

      {isDeleted ? (
        <div
          className="border-destructive/40 bg-destructive/10 text-destructive flex items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium"
          role="alert"
          data-testid="deleted-product-banner"
        >
          Producto eliminado el{" "}
          {DATE_FORMATTER.format(new Date(product.deletedAt as string))}
        </div>
      ) : null}

      <header
        className="flex flex-wrap items-center gap-3"
        data-testid="product-detail-header"
      >
        <h1
          className="text-3xl font-bold tracking-tight"
          data-testid="product-name"
        >
          {product.name}
        </h1>
        <code
          className="bg-muted rounded px-2 py-1 font-mono text-sm"
          data-testid="product-sku"
        >
          {product.sku}
        </code>
        {product.categoryName ? (
          <Badge variant="secondary" data-testid="product-category">
            {product.categoryName}
          </Badge>
        ) : null}
        {!isDeleted && isLowStock ? (
          <Badge variant="destructive" data-testid="low-stock-badge">
            Bajo stock
          </Badge>
        ) : null}
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="product-info-card">
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row
              label="Stock actual"
              value={
                <span
                  className="font-mono tabular-nums"
                  data-testid="info-stock"
                >
                  {stockActual}
                </span>
              }
            />
            <Row
              label="Precio"
              value={
                <span className="font-mono" data-testid="info-price">
                  {product.currency} {MONEY_FORMATTER.format(product.price)}
                </span>
              }
            />
            <Row
              label="Proveedor"
              value={
                product.supplierName ? (
                  <span data-testid="info-supplier">{product.supplierName}</span>
                ) : (
                  <span
                    className="text-muted-foreground"
                    data-testid="info-supplier-empty"
                  >
                    Sin proveedor asociado
                  </span>
                )
              }
            />
            <Row
              label="Última actualización"
              value={
                <span data-testid="info-updated-at">
                  {DATE_FORMATTER.format(new Date(product.updatedAt))}
                </span>
              }
            />
          </CardContent>
        </Card>

        <Card data-testid="product-movements-card">
          <CardHeader>
            <CardTitle>Movimientos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {total_movements === 0 ? (
              <div
                className="text-muted-foreground rounded-lg border border-dashed p-8 text-center"
                data-testid="movements-empty-state"
              >
                Sin movimientos registrados aún
              </div>
            ) : (
              <>
                <MovementsHistoryTable
                  movements={movements}
                  productSkuById={{ [product.id]: product.sku }}
                />
                <nav
                  className="flex items-center justify-between text-sm"
                  data-testid="movements-pagination"
                >
                  <span
                    className="text-muted-foreground"
                    data-testid="movements-pagination-info"
                  >
                    Página {page} de {totalPages} · {total_movements} movimientos
                  </span>
                  <div className="flex items-center gap-2">
                    {hasPrev ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={buildHref(page - 1)}
                          data-testid="movements-pagination-prev"
                        >
                          Anterior
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        data-testid="movements-pagination-prev"
                      >
                        Anterior
                      </Button>
                    )}
                    {hasNext ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={buildHref(page + 1)}
                          data-testid="movements-pagination-next"
                        >
                          Siguiente
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        data-testid="movements-pagination-next"
                      >
                        Siguiente
                      </Button>
                    )}
                  </div>
                </nav>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <PriceHistoryCard entries={priceHistory} currency={product.currency} />
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
