/**
 * Product Detail Page (/products/[id])
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getProductUseCase,
  getStockLevelUseCase,
  listStockMovementsUseCase,
} from "@infrastructure/container";
import { StockMovementsTable } from "@/components/stock/StockMovementsTable";
import { DeleteProductButton } from "@/components/products/DeleteProductButton";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;

  const product = await getProductUseCase.execute({ id }).catch(() => null);
  if (!product) return notFound();

  const [stockLevel, movements] = await Promise.all([
    getStockLevelUseCase.execute({ productId: id }).catch(() => null),
    listStockMovementsUseCase.execute({ productId: id }).catch(() => []),
  ]);

  const stockBadgeVariant = stockLevel?.isOutOfStock
    ? "destructive"
    : stockLevel?.isLowStock
      ? "outline"
      : "secondary";

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/products">
            <ArrowLeft className="mr-1 h-4 w-4" /> Products
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/products/${id}/edit`}>
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Link>
          </Button>
          <DeleteProductButton productId={id} productName={product.name} />
        </div>
      </div>

      {/* Product details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Name" value={product.name} />
            <Row label="SKU" value={<code className="font-mono text-sm">{product.sku}</code>} />
            <Row label="Price" value={`${product.currency} ${product.price.toFixed(2)}`} />
            <Row label="Category" value={product.categoryName ?? "—"} />
            <Row
              label="Description"
              value={product.description ?? <span className="text-muted-foreground italic">No description</span>}
            />
            <Row label="Created" value={new Date(product.createdAt).toLocaleDateString()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Level</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stockLevel ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold">{stockLevel.quantity}</span>
                  <Badge
                    variant={stockBadgeVariant}
                    className={
                      stockLevel.isLowStock && !stockLevel.isOutOfStock
                        ? "border-yellow-500 text-yellow-600"
                        : ""
                    }
                  >
                    {stockLevel.isOutOfStock
                      ? "Out of Stock"
                      : stockLevel.isLowStock
                        ? "Low Stock"
                        : "In Stock"}
                  </Badge>
                </div>
                <Row label="Minimum threshold" value={`${stockLevel.minQuantity} units`} />
                <Row
                  label="Last updated"
                  value={new Date(stockLevel.updatedAt).toLocaleString()}
                />
                <Button asChild size="sm" className="mt-2">
                  <Link href={`/stock/adjust?productId=${id}`}>Adjust Stock</Link>
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No stock data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movement history */}
      <Card>
        <CardHeader>
          <CardTitle>Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          <StockMovementsTable movements={movements} hideProductColumn />
        </CardContent>
      </Card>
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
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
