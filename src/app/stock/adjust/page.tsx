/**
 * Adjust Stock Page (/stock/adjust)
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdjustStockForm } from "@/components/stock/AdjustStockForm";
import { listProductsUseCase } from "@infrastructure/container";

interface AdjustStockPageProps {
  searchParams: Promise<{ productId?: string }>;
}

export default async function AdjustStockPage({ searchParams }: AdjustStockPageProps) {
  const params = await searchParams;
  const products = await listProductsUseCase.execute();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/stock">
            <ArrowLeft className="mr-1 h-4 w-4" /> Stock Levels
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Adjust Stock</h1>
          <p className="text-muted-foreground mt-1">
            Record a stock movement (receive, ship, or correct).
          </p>
        </div>
      </div>
      <AdjustStockForm products={products} defaultProductId={params.productId} />
    </div>
  );
}
