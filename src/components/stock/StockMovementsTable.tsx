"use client";

import { Badge } from "@/components/ui/badge";
import type { StockMovementDTO } from "@application/dtos/StockDTO";

interface StockMovementsTableProps {
  movements: StockMovementDTO[];
  hideProductColumn?: boolean;
}

const typeBadge: Record<string, { label: string; className: string }> = {
  IN: { label: "Stock In", className: "bg-green-100 text-green-700 border-green-200" },
  OUT: { label: "Stock Out", className: "bg-red-100 text-red-700 border-red-200" },
  ADJUSTMENT: { label: "Adjustment", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

export function StockMovementsTable({
  movements,
  hideProductColumn = false,
}: StockMovementsTableProps) {
  if (movements.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium">No movements recorded</p>
        <p className="mt-1 text-sm">Stock movements will appear here once recorded.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Date</th>
            {!hideProductColumn && (
              <th className="px-4 py-3 text-left font-medium">Product</th>
            )}
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="px-4 py-3 text-right font-medium">Quantity</th>
            <th className="px-4 py-3 text-left font-medium">Reason</th>
            <th className="px-4 py-3 text-left font-medium">Reference</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {movements.map((movement) => {
            const badge = typeBadge[movement.type] ?? {
              label: movement.type,
              className: "",
            };
            return (
              <tr key={movement.id} className="hover:bg-muted/30 transition-colors">
                <td className="text-muted-foreground px-4 py-3 text-xs">
                  {new Date(movement.createdAt).toLocaleString()}
                </td>
                {!hideProductColumn && (
                  <td className="px-4 py-3 font-medium">{movement.productName}</td>
                )}
                <td className="px-4 py-3">
                  <Badge variant="outline" className={badge.className}>
                    {badge.label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold">
                  {movement.type === "OUT" ? "-" : "+"}
                  {movement.quantity}
                </td>
                <td className="text-muted-foreground px-4 py-3">
                  {movement.reason ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {movement.reference ? (
                    <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                      {movement.reference}
                    </code>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
