"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import type { LowStockProduct, UrgencyLevel } from "@interfaces/alerts/types";

interface AlertsTableProps {
  rows: LowStockProduct[];
}

const MONEY_FORMATTER = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  "sin-stock": "Sin stock",
  critico: "Crítico",
  bajo: "Bajo",
  atencion: "Atención",
};

const URGENCY_CLASSES: Record<UrgencyLevel, string> = {
  "sin-stock":
    "border-transparent bg-red-700 text-white hover:bg-red-700/90 shadow",
  critico:
    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow",
  bajo: "border-transparent bg-orange-500 text-white hover:bg-orange-500/90 shadow",
  atencion:
    "border-transparent bg-yellow-400 text-yellow-950 hover:bg-yellow-400/90 shadow",
};

export function AlertsTable({ rows }: AlertsTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-lg border" data-testid="alerts-table">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-medium">SKU</th>
            <th className="px-4 py-3 text-left font-medium">Nombre</th>
            <th className="px-4 py-3 text-left font-medium">Categoría</th>
            <th className="px-4 py-3 text-right font-medium">Stock actual</th>
            <th className="px-4 py-3 text-right font-medium">Stock value</th>
            <th className="px-4 py-3 text-left font-medium">Urgencia</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => {
            const href = `/products/${encodeURIComponent(row.productId)}`;
            return (
              <tr
                key={row.productId}
                data-testid="alert-row"
                data-product-sku={row.sku}
                data-urgency={row.urgency}
                role="link"
                tabIndex={0}
                onClick={() => router.push(href)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(href);
                  }
                }}
                className="hover:bg-muted/30 cursor-pointer transition-colors focus:bg-muted/40 focus:outline-none"
              >
                <td className="px-4 py-3">
                  <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                    {row.sku}
                  </code>
                </td>
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">
                  {row.categoryName ? (
                    <Badge variant="secondary">{row.categoryName}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {row.stockActual}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {row.currency} {MONEY_FORMATTER.format(row.stockValue)}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={URGENCY_CLASSES[row.urgency]}
                    data-testid="urgency-badge"
                    data-urgency={row.urgency}
                  >
                    {URGENCY_LABEL[row.urgency]}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
