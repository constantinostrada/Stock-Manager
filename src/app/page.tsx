/**
 * Dashboard Page (/)
 *
 * Displays a high-level inventory summary with quick-access navigation cards.
 * Data is fetched server-side via use cases called directly (Server Component).
 */

import Link from "next/link";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStockSummaryUseCase, listStockLevelsUseCase } from "@infrastructure/container";

export default async function DashboardPage() {
  const [summaryResult, lowStockResult] = await Promise.allSettled([
    getStockSummaryUseCase.execute(),
    listStockLevelsUseCase.execute({ lowStockOnly: true }),
  ]);

  const summary =
    summaryResult.status === "fulfilled"
      ? summaryResult.value
      : { totalProducts: 0, outOfStockCount: 0, lowStockCount: 0, totalInventoryValue: 0, currency: "USD" };

  const lowStockItems =
    lowStockResult.status === "fulfilled" ? lowStockResult.value : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your inventory and stock levels.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalProducts}</div>
            <p className="text-muted-foreground text-xs">Active SKUs in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-destructive text-2xl font-bold">
              {summary.outOfStockCount}
            </div>
            <p className="text-muted-foreground text-xs">Products needing restock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {summary.lowStockCount}
            </div>
            <p className="text-muted-foreground text-xs">Below minimum threshold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: summary.currency,
              }).format(summary.totalInventoryValue)}
            </div>
            <p className="text-muted-foreground text-xs">Total stock value at cost</p>
          </CardContent>
        </Card>
      </div>

      {/* Low stock alert table */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">⚠️ Attention Required</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/stock">
                View all stock <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{item.productName}</p>
                    <p className="text-muted-foreground text-xs">{item.productSku}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm">
                      {item.quantity} / {item.minQuantity} min
                    </span>
                    <Badge
                      variant={item.isOutOfStock ? "destructive" : "outline"}
                      className={
                        !item.isOutOfStock
                          ? "border-yellow-500 text-yellow-600"
                          : ""
                      }
                    >
                      {item.isOutOfStock ? "Out of Stock" : "Low Stock"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:bg-accent/50 transition-colors">
          <CardContent className="pt-6">
            <Link href="/products/new" className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <Package className="text-primary h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Add Product</p>
                <p className="text-muted-foreground text-sm">Register a new SKU</p>
              </div>
              <ArrowRight className="text-muted-foreground ml-auto h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:bg-accent/50 transition-colors">
          <CardContent className="pt-6">
            <Link href="/stock/adjust" className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <TrendingDown className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Adjust Stock</p>
                <p className="text-muted-foreground text-sm">Record a movement</p>
              </div>
              <ArrowRight className="text-muted-foreground ml-auto h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:bg-accent/50 transition-colors">
          <CardContent className="pt-6">
            <Link href="/stock/movements" className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Movement History</p>
                <p className="text-muted-foreground text-sm">View all movements</p>
              </div>
              <ArrowRight className="text-muted-foreground ml-auto h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
