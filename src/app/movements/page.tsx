/**
 * Movements Page (/movements)
 *
 * Chronological history (DESC) of all stock movements, with client-side
 * filtering by reason / type / product (T11).
 *
 * LAYER: interfaces (Next.js route handler)
 */

import { MovementsFilters } from "@/components/stock/MovementsFilters";
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

  // AC-3: the Producto select shows only products that have ≥1 movement.
  const productIdsWithMovement = new Set(movements.map((m) => m.productId));
  const productsWithMovements = products
    .filter((p) => productIdsWithMovement.has(p.id))
    .map((p) => ({ id: p.id, name: p.name, sku: p.sku }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Movimientos</h1>
      </div>

      <MovementsFilters
        movements={movements}
        products={productsWithMovements}
        productSkuById={productSkuById}
      />
    </div>
  );
}
