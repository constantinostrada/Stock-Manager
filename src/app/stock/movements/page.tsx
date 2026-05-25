/**
 * Stock Movements History Page (/stock/movements)
 */

import { StockMovementsTable } from "@/components/stock/StockMovementsTable";
import { listStockMovementsUseCase, listProductsUseCase } from "@infrastructure/container";

interface MovementsPageProps {
  searchParams: Promise<{
    productId?: string;
    type?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}

export default async function MovementsPage({ searchParams }: MovementsPageProps) {
  const params = await searchParams;

  const [movements, products] = await Promise.all([
    listStockMovementsUseCase.execute({
      productId: params.productId,
      type: params.type,
    }),
    listProductsUseCase.execute(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Movement History</h1>
        <p className="text-muted-foreground mt-1">
          Full audit trail of all stock changes.
        </p>
      </div>

      {/* Filter form */}
      <form className="flex flex-wrap gap-3" method="GET">
        <select
          name="productId"
          defaultValue={params.productId ?? ""}
          className="border-input bg-background focus-visible:ring-ring flex h-9 rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
        >
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>

        <select
          name="type"
          defaultValue={params.type ?? ""}
          className="border-input bg-background focus-visible:ring-ring flex h-9 rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
        >
          <option value="">All types</option>
          <option value="IN">Stock In</option>
          <option value="OUT">Stock Out</option>
          <option value="ADJUSTMENT">Adjustment</option>
        </select>

        <button
          type="submit"
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors"
        >
          Filter
        </button>
        <a
          href="/stock/movements"
          className="text-muted-foreground hover:text-foreground inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors"
        >
          Clear
        </a>
      </form>

      <p className="text-muted-foreground text-sm">
        {movements.length} movement{movements.length !== 1 ? "s" : ""} found
      </p>

      <StockMovementsTable movements={movements} />
    </div>
  );
}
