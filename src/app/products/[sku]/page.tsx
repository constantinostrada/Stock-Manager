/**
 * Product Detail Page (/products/[sku])
 *
 * Server Component that fetches a product (by SKU) together with its stock
 * level and full movement history, then renders the detail layout per T8 ACs:
 * header with name/SKU/category + "Bajo stock" badge, two-column body
 * (info card left, movements table right), back button to /products.
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
import { getProductBySku } from "@interfaces/actions/productActions";
import { LOW_STOCK_THRESHOLD } from "@interfaces/dashboard/constants";

interface ProductDetailPageProps {
  params: Promise<{ sku: string }>;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

const DATE_ONLY_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
});

const MONEY_FORMATTER = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { sku } = await params;
  const decoded = decodeURIComponent(sku);

  const result = await getProductBySku(decoded);
  if (!result.success) return notFound();

  const { product, stockLevel, movements } = result.data;
  const stockActual = stockLevel?.quantity ?? 0;
  const isLowStock = stockActual < LOW_STOCK_THRESHOLD;
  const valorTotal = stockActual * product.price;

  return (
    <div className="space-y-6" data-testid="product-detail-page">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/products" data-testid="back-to-catalog">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver al catálogo
          </Link>
        </Button>
      </div>

      {/* Header */}
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
        {isLowStock ? (
          <Badge variant="destructive" data-testid="low-stock-badge">
            Bajo stock
          </Badge>
        ) : null}
      </header>

      {/* Two-column body: info card (left) + movements (right) */}
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
              label="Valor total"
              value={
                <span className="font-mono" data-testid="info-valor-total">
                  {product.currency} {MONEY_FORMATTER.format(valorTotal)}
                </span>
              }
            />
            <Row
              label="Fecha de creación"
              value={
                <span data-testid="info-created-at">
                  {DATE_ONLY_FORMATTER.format(new Date(product.createdAt))}
                </span>
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
          <CardContent>
            {movements.length === 0 ? (
              <div
                className="text-muted-foreground rounded-lg border border-dashed p-8 text-center"
                data-testid="movements-empty-state"
              >
                Sin movimientos registrados aún
              </div>
            ) : (
              <MovementsHistoryTable
                movements={movements}
                productSkuById={{ [product.id]: product.sku }}
              />
            )}
          </CardContent>
        </Card>
      </div>
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
