/**
 * Inventory Dashboard (/dashboard)
 *
 * Read-only view showing aggregate inventory metrics + the 5 products with the
 * lowest current stock. Server Component — no client interactivity.
 *
 * LAYER: interfaces (Next.js route handler)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInventoryDashboardUseCase } from "@infrastructure/container";
import type { InventoryDashboardDTO } from "@application/dtos/InventoryDashboardDTO";

const CURRENCY_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatStockValue(value: number): string {
  return CURRENCY_FORMATTER.format(value);
}

export default async function InventoryDashboardPage() {
  const data = await getInventoryDashboardUseCase.execute();

  return (
    <div className="space-y-8" data-testid="inventory-dashboard-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard de inventario
        </h1>
        <p className="text-muted-foreground mt-1">
          Vista de solo lectura con las métricas agregadas del catálogo.
        </p>
      </div>

      <MetricsCards data={data} />

      <LowestStockSection data={data} />
    </div>
  );
}

function MetricsCards({ data }: { data: InventoryDashboardDTO }) {
  const hasLowStock = data.lowStockCount > 0;
  return (
    <div
      className="grid gap-4 md:grid-cols-3"
      data-testid="inventory-dashboard-metrics"
    >
      <Card data-testid="metric-total-products">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="text-3xl font-bold tabular-nums"
            data-testid="metric-total-products-value"
          >
            {data.totalProducts}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="metric-total-stock-value">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Valor total del stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="text-3xl font-bold tabular-nums"
            data-testid="metric-total-stock-value-value"
          >
            {formatStockValue(data.totalStockValue)}
          </div>
        </CardContent>
      </Card>

      <Card
        data-testid="metric-low-stock-count"
        data-alert={hasLowStock ? "true" : "false"}
        className={
          hasLowStock ? "border-destructive/40 bg-destructive/5" : undefined
        }
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Productos con bajo stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={
              "text-3xl font-bold tabular-nums " +
              (hasLowStock ? "text-destructive" : "")
            }
            data-testid="metric-low-stock-count-value"
          >
            {data.lowStockCount}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LowestStockSection({ data }: { data: InventoryDashboardDTO }) {
  const hasRows = data.lowestStockProducts.length > 0;
  return (
    <section
      className="space-y-3"
      data-testid="inventory-dashboard-lowest-stock-section"
    >
      <h2 className="text-xl font-semibold tracking-tight">
        5 productos con menor stock
      </h2>
      {hasRows ? (
        <ul
          className="divide-y rounded-md border"
          data-testid="inventory-dashboard-lowest-stock-list"
        >
          {data.lowestStockProducts.map((row) => (
            <li
              key={row.productId}
              className="flex items-center justify-between px-4 py-3"
              data-testid="inventory-dashboard-lowest-stock-row"
            >
              <span
                className="text-sm font-medium"
                data-testid="lowest-stock-row-name"
              >
                {row.name}
              </span>
              <span
                className="text-sm tabular-nums"
                data-testid="lowest-stock-row-stock"
              >
                {row.currentStock}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div
          className="text-muted-foreground rounded-md border px-4 py-6 text-sm"
          data-testid="inventory-dashboard-lowest-stock-empty"
        >
          No hay productos en el catálogo.
        </div>
      )}
    </section>
  );
}
