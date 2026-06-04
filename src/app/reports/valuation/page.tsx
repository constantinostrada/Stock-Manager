/**
 * Inventory Valuation Report (/reports/valuation)
 *
 * Read-only view showing the total monetary value of the inventory
 * (Σ price × quantity), with breakdowns by category and supplier and a
 * CSS-based horizontal bar chart for the category breakdown.
 * Server Component — no client interactivity.
 *
 * LAYER: interfaces (Next.js route handler)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInventoryValuationReportUseCase } from "@infrastructure/container";
import type {
  InventoryValuationReportDTO,
  ValuationBreakdownRowDTO,
} from "@application/dtos/InventoryValuationReportDTO";

const CURRENCY_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatValue(value: number): string {
  return CURRENCY_FORMATTER.format(value);
}

export default async function InventoryValuationReportPage() {
  const data = await getInventoryValuationReportUseCase.execute();

  return (
    <div className="space-y-8" data-testid="valuation-report-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Reporte de valuación de inventario
        </h1>
        <p className="text-muted-foreground mt-1">
          Valor monetario total del inventario (precio × cantidad por
          producto), desglosado por categoría y proveedor.
        </p>
      </div>

      <SummaryCards data={data} />

      <CategoryChart rows={data.byCategory} />

      <div className="grid gap-8 lg:grid-cols-2">
        <BreakdownSection
          title="Desglose por categoría"
          testId="valuation-by-category"
          groupHeader="Categoría"
          rows={data.byCategory}
          emptyMessage="No hay productos en el catálogo."
        />
        <BreakdownSection
          title="Desglose por proveedor"
          testId="valuation-by-supplier"
          groupHeader="Proveedor"
          rows={data.bySupplier}
          emptyMessage="No hay productos en el catálogo."
        />
      </div>
    </div>
  );
}

function SummaryCards({ data }: { data: InventoryValuationReportDTO }) {
  return (
    <div className="grid gap-4 md:grid-cols-3" data-testid="valuation-summary">
      <Card data-testid="valuation-grand-total">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Valor total del inventario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="text-3xl font-bold tabular-nums"
            data-testid="valuation-grand-total-value"
          >
            {formatValue(data.grandTotal)}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="valuation-total-units">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unidades totales</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="text-3xl font-bold tabular-nums"
            data-testid="valuation-total-units-value"
          >
            {data.totalUnits}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="valuation-total-products">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Productos valuados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="text-3xl font-bold tabular-nums"
            data-testid="valuation-total-products-value"
          >
            {data.totalProducts}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CategoryChart({ rows }: { rows: ValuationBreakdownRowDTO[] }) {
  if (rows.length === 0) return null;
  const maxValue = Math.max(...rows.map((r) => r.totalValue), 0);
  return (
    <section className="space-y-3" data-testid="valuation-category-chart">
      <h2 className="text-xl font-semibold tracking-tight">
        Valor por categoría
      </h2>
      <div className="space-y-2 rounded-md border p-4">
        {rows.map((row) => {
          // Bars scale relative to the largest category so the chart always
          // fills its width; the % label still refers to the grand total.
          const widthPct = maxValue > 0 ? (row.totalValue / maxValue) * 100 : 0;
          return (
            <div
              key={row.groupId ?? "uncategorized"}
              className="space-y-1"
              data-testid="valuation-chart-row"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{row.groupName}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatValue(row.totalValue)} · {row.percentOfTotal}%
                </span>
              </div>
              <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${widthPct}%` }}
                  data-testid="valuation-chart-bar"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BreakdownSection({
  title,
  testId,
  groupHeader,
  rows,
  emptyMessage,
}: {
  title: string;
  testId: string;
  groupHeader: string;
  rows: ValuationBreakdownRowDTO[];
  emptyMessage: string;
}) {
  return (
    <section className="space-y-3" data-testid={testId}>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-2 font-medium">{groupHeader}</th>
                <th className="px-4 py-2 text-right font-medium">Valor</th>
                <th className="px-4 py-2 text-right font-medium">Unidades</th>
                <th className="px-4 py-2 text-right font-medium">% del total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr
                  key={row.groupId ?? "ungrouped"}
                  data-testid={`${testId}-row`}
                >
                  <td className="px-4 py-2 font-medium">{row.groupName}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatValue(row.totalValue)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {row.totalUnits}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {row.percentOfTotal}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="text-muted-foreground rounded-md border px-4 py-6 text-sm"
          data-testid={`${testId}-empty`}
        >
          {emptyMessage}
        </div>
      )}
    </section>
  );
}
