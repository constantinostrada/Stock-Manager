"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StockLevelDTO } from "@application/dtos/StockDTO";

interface StockLevelsTableProps {
  stockLevels: StockLevelDTO[];
}

export function StockLevelsTable({ stockLevels }: StockLevelsTableProps) {
  if (stockLevels.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium">No stock data</p>
        <p className="mt-1 text-sm">Add products to start tracking stock.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Product</th>
            <th className="px-4 py-3 text-left font-medium">SKU</th>
            <th className="px-4 py-3 text-right font-medium">Quantity</th>
            <th className="px-4 py-3 text-right font-medium">Min</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Last Updated</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {stockLevels.map((level) => (
            <tr
              key={level.id}
              className={`hover:bg-muted/30 transition-colors ${
                level.isOutOfStock
                  ? "bg-destructive/5"
                  : level.isLowStock
                    ? "bg-yellow-50"
                    : ""
              }`}
            >
              <td className="px-4 py-3">
                <Link
                  href={`/products/${level.productId}`}
                  className="font-medium hover:underline"
                >
                  {level.productName}
                </Link>
              </td>
              <td className="px-4 py-3">
                <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                  {level.productSku}
                </code>
              </td>
              <td className="px-4 py-3 text-right font-mono font-semibold">
                {level.quantity}
              </td>
              <td className="text-muted-foreground px-4 py-3 text-right font-mono">
                {level.minQuantity}
              </td>
              <td className="px-4 py-3">
                {level.isOutOfStock ? (
                  <Badge variant="destructive">Out of Stock</Badge>
                ) : level.isLowStock ? (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                    Low Stock
                  </Badge>
                ) : (
                  <Badge variant="secondary">OK</Badge>
                )}
              </td>
              <td className="text-muted-foreground px-4 py-3 text-sm">
                {new Date(level.updatedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/stock/adjust?productId=${level.productId}`}>
                    Adjust
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
