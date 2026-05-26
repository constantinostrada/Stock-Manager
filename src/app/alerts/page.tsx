/**
 * Alerts Page (/alerts)
 *
 * Lists products whose stock is below LOW_STOCK_THRESHOLD ordered most-critical
 * first, with a 4-band urgency badge per row. Server Component — fetches via
 * the getLowStockProducts server action.
 *
 * LAYER: interfaces (Next.js App Router page)
 */

import { AlertsTable } from "@/components/alerts/AlertsTable";
import { getLowStockProducts } from "@interfaces/actions/alertsActions";

export default async function AlertsPage() {
  const rows = await getLowStockProducts();
  const count = rows.length;
  const subtitle =
    count === 1
      ? "1 producto requiere reposición"
      : `${count} productos requieren reposición`;

  return (
    <div className="space-y-6" data-testid="alerts-page">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          Alertas de bajo stock
        </h1>
        <p className="text-muted-foreground mt-1" data-testid="alerts-subtitle">
          {subtitle}
        </p>
      </header>

      {count === 0 ? (
        <div
          className="text-muted-foreground rounded-lg border border-dashed p-12 text-center"
          data-testid="alerts-empty-state"
        >
          <p className="text-lg font-medium">
            ✓ Todo en orden · Ningún producto en bajo stock
          </p>
        </div>
      ) : (
        <AlertsTable rows={rows} />
      )}
    </div>
  );
}
