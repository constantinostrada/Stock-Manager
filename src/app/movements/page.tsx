/**
 * Movements Page (/movements)
 *
 * Chronological history (DESC) of all stock movements.
 * Columns: Fecha/hora · Producto (nombre + SKU) · Tipo (badge) · Cantidad · Razón.
 *
 * LAYER: interfaces (Next.js route handler)
 */

import { MovementsHistoryTable } from "@/components/stock/MovementsHistoryTable";
import {
  listStockMovementsUseCase,
  listProductsUseCase,
} from "@infrastructure/container";

export default async function MovementsPage() {
  // ListStockMovementsUseCase already returns movements orderBy createdAt DESC.
  const [movements, products] = await Promise.all([
    listStockMovementsUseCase.execute({}),
    listProductsUseCase.execute(),
  ]);

  const productSkuById: Record<string, string> = {};
  for (const product of products) {
    productSkuById[product.id] = product.sku;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Movimientos</h1>
        <p className="text-muted-foreground mt-1">
          {movements.length} movimiento{movements.length !== 1 ? "s" : ""} registrado
          {movements.length !== 1 ? "s" : ""}.
        </p>
      </div>

      <MovementsHistoryTable movements={movements} productSkuById={productSkuById} />
    </div>
  );
}
