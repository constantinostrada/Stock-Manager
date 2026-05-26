import { Badge } from "@/components/ui/badge";
import type { StockMovementDTO } from "@application/dtos/StockDTO";

const TYPE_TO_META: Record<
  string,
  { label: string; variant: "entrada" | "salida" | "neutro" }
> = {
  IN: { label: "ENTRADA", variant: "entrada" },
  OUT: { label: "SALIDA", variant: "salida" },
  ADJUSTMENT: { label: "AJUSTE", variant: "neutro" },
};

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

export interface MovementsHistoryTableProps {
  /** Movements already sorted chronologically DESC by the use case. */
  movements: StockMovementDTO[];
  /** Map of productId → SKU, used to surface "Producto (nombre + SKU)" per AC-5. */
  productSkuById?: Record<string, string>;
}

export function MovementsHistoryTable({
  movements,
  productSkuById = {},
}: MovementsHistoryTableProps) {
  if (movements.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium">Sin movimientos registrados.</p>
        <p className="text-sm mt-1">
          Registrá entradas o salidas desde la página de productos.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm" data-testid="movements-table">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Fecha / hora</th>
            <th className="px-4 py-3 text-left font-medium">Producto</th>
            <th className="px-4 py-3 text-left font-medium">Tipo</th>
            <th className="px-4 py-3 text-right font-medium">Cantidad</th>
            <th className="px-4 py-3 text-left font-medium">Razón</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {movements.map((movement) => {
            const sku = productSkuById[movement.productId];
            const meta =
              TYPE_TO_META[movement.type] ?? {
                label: movement.type,
                variant: "neutro" as const,
              };
            return (
              <tr
                key={movement.id}
                data-testid="movement-row"
                data-tipo={meta.label}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                  {DATE_FORMATTER.format(new Date(movement.createdAt))}
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium">{movement.productName}</div>
                    {sku && (
                      <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                        {sku}
                      </code>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {meta.variant === "entrada" ? (
                    <Badge
                      data-testid="tipo-badge"
                      className="border-transparent bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      {meta.label}
                    </Badge>
                  ) : meta.variant === "salida" ? (
                    <Badge data-testid="tipo-badge" variant="destructive">
                      {meta.label}
                    </Badge>
                  ) : (
                    <Badge data-testid="tipo-badge" variant="secondary">
                      {meta.label}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {movement.quantity}
                </td>
                <td className="px-4 py-3">
                  {movement.reason ?? (
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
