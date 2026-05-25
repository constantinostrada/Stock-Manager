/**
 * Stock Levels Page (/stock)
 */

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockLevelsTable } from "@/components/stock/StockLevelsTable";
import { listStockLevelsUseCase } from "@infrastructure/container";

interface StockPageProps {
  searchParams: Promise<{ lowStockOnly?: string }>;
}

export default async function StockPage({ searchParams }: StockPageProps) {
  const params = await searchParams;
  const lowStockOnly = params.lowStockOnly === "true";

  const stockLevels = await listStockLevelsUseCase.execute({ lowStockOnly });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Levels</h1>
          <p className="text-muted-foreground mt-1">
            {stockLevels.length} product{stockLevels.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <Button asChild>
          <Link href="/stock/adjust">
            <Plus className="mr-2 h-4 w-4" /> Adjust Stock
          </Link>
        </Button>
      </div>

      {/* Filter toggle */}
      <div className="flex gap-2">
        <Button
          variant={lowStockOnly ? "secondary" : "outline"}
          size="sm"
          asChild
        >
          <Link href="/stock?lowStockOnly=true">Low Stock Only</Link>
        </Button>
        <Button
          variant={!lowStockOnly ? "secondary" : "outline"}
          size="sm"
          asChild
        >
          <Link href="/stock">All Products</Link>
        </Button>
      </div>

      <StockLevelsTable stockLevels={stockLevels} />
    </div>
  );
}
