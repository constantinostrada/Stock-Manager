/**
 * Dashboard Page (/)
 *
 * Three metric cards (Total productos / Valor inventario / Bajo stock) plus
 * the last 5 stock movements. Server Component — no client interactivity.
 *
 * LAYER: interfaces (Next.js route handler)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MovementsHistoryTable } from "@/components/stock/MovementsHistoryTable";
import {
  getDashboardMetrics,
  getTodaysSummary,
} from "@interfaces/actions/dashboardActions";
import type {
  DashboardMetrics,
  TodaysSummary,
} from "@interfaces/dashboard/constants";
import {
  listStockMovementsUseCase,
  listProductsUseCase,
} from "@infrastructure/container";

const CURRENCY_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatInventoryValue(value: number): string {
  return CURRENCY_FORMATTER.format(value);
}

export default async function DashboardPage() {
  const [metrics, todaysSummary, movements, products] = await Promise.all([
    getDashboardMetrics(),
    getTodaysSummary(),
    listStockMovementsUseCase.execute({}),
    listProductsUseCase.execute(),
  ]);

  const productSkuById: Record<string, string> = {};
  for (const product of products) {
    productSkuById[product.id] = product.sku;
  }

  const recentMovements = movements.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Resumen general del inventario.
        </p>
      </div>

      <MetricsCards metrics={metrics} />

      <TodaysSummaryCard summary={todaysSummary} />

      <section className="space-y-3" data-testid="recent-movements-section">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            Últimos movimientos
          </h2>
          <p className="text-muted-foreground text-sm">
            {recentMovements.length} de {movements.length}
          </p>
        </div>
        <MovementsHistoryTable
          movements={recentMovements}
          productSkuById={productSkuById}
        />
      </section>
    </div>
  );
}

function MetricsCards({ metrics }: { metrics: DashboardMetrics }) {
  const bajoStockAlert = metrics.productosConBajoStock > 0;

  return (
    <div
      className="grid gap-4 md:grid-cols-3"
      data-testid="dashboard-metrics-cards"
    >
      <Card data-testid="metric-total-productos">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <span aria-hidden="true">📦</span> Total productos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tabular-nums">
            {metrics.totalProductos}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="metric-valor-inventario">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <span aria-hidden="true">💰</span> Valor inventario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="text-3xl font-bold tabular-nums"
            data-testid="valor-inventario-value"
          >
            {formatInventoryValue(metrics.valorTotalInventario)}
          </div>
        </CardContent>
      </Card>

      <Card
        data-testid="metric-bajo-stock"
        data-alert={bajoStockAlert ? "true" : "false"}
        className={
          bajoStockAlert ? "border-destructive/40 bg-destructive/5" : undefined
        }
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <span aria-hidden="true">⚠️</span> Bajo stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={
              "text-3xl font-bold tabular-nums " +
              (bajoStockAlert ? "text-destructive" : "")
            }
            data-testid="bajo-stock-value"
          >
            {metrics.productosConBajoStock}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TodaysSummaryCard({ summary }: { summary: TodaysSummary }) {
  const hasMovements =
    summary.entradasCount + summary.salidasCount + summary.ajustesCount > 0;

  return (
    <Card data-testid="todays-summary-card">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Resumen del día
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasMovements ? (
          <div
            className="grid grid-cols-2 gap-4 md:grid-cols-4"
            data-testid="todays-summary-grid"
          >
            <SummaryStat
              testId="summary-entradas"
              label="Entradas"
              value={summary.entradasCount}
            />
            <SummaryStat
              testId="summary-salidas"
              label="Salidas"
              value={summary.salidasCount}
            />
            <SummaryStat
              testId="summary-ajustes"
              label="Ajustes"
              value={summary.ajustesCount}
            />
            <SummaryStat
              testId="summary-valor-movido"
              label="Valor movido"
              value={formatInventoryValue(summary.totalValueMoved)}
            />
          </div>
        ) : (
          <div
            className="text-muted-foreground py-4 text-sm"
            data-testid="todays-summary-empty-state"
          >
            Sin movimientos hoy
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryStat({
  testId,
  label,
  value,
}: {
  testId: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="space-y-1" data-testid={testId}>
      <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {label}
      </div>
      <div
        className="text-2xl font-bold tabular-nums"
        data-testid={`${testId}-value`}
      >
        {value}
      </div>
    </div>
  );
}
