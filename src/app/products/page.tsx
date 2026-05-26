/**
 * Products List Page (/products)
 *
 * Server Component — fetches product data directly via use case.
 */

import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductsTable } from "@/components/products/ProductsTable";
import { NewProductDialog } from "@/components/products/NewProductDialog";
import {
  listProductsUseCase,
  listCategoriesUseCase,
  listStockLevelsUseCase,
} from "@infrastructure/container";

interface ProductsPageProps {
  searchParams: Promise<{
    name?: string;
    categoryId?: string;
    skuContains?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  const [products, categories, stockLevels] = await Promise.all([
    listProductsUseCase.execute({
      name: params.name,
      categoryId: params.categoryId,
      skuContains: params.skuContains,
    }),
    listCategoriesUseCase.execute(),
    listStockLevelsUseCase.execute(),
  ]);

  const stockByProductId: Record<string, number> = {};
  for (const level of stockLevels) {
    stockByProductId[level.productId] = level.quantity;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">
            {products.length} product{products.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <NewProductDialog
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>

      {/* Search / filter bar */}
      <form className="flex flex-wrap gap-3" method="GET">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <input
            name="name"
            defaultValue={params.name ?? ""}
            placeholder="Search by name…"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 pl-8 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
          />
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <input
            name="skuContains"
            defaultValue={params.skuContains ?? ""}
            placeholder="Filter by SKU…"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 pl-8 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
          />
        </div>
        <select
          name="categoryId"
          defaultValue={params.categoryId ?? ""}
          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary" size="sm">
          Filter
        </Button>
        <Button type="reset" variant="ghost" size="sm" asChild>
          <Link href="/products">Clear</Link>
        </Button>
      </form>

      <ProductsTable products={products} stockByProductId={stockByProductId} />
    </div>
  );
}
