/**
 * Movements Page (/movements)
 *
 * Chronological history (DESC) of all stock movements, with client-side
 * filtering by reason / type / product (T11).
 *
 * LAYER: interfaces (Next.js route handler)
 */

import { MovementsFilters } from "@/components/stock/MovementsFilters";
import { NewMovementDialog } from "@/components/stock/NewMovementDialog";
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

  // T11 MovementsFilters: Producto filter dropdown only shows products with
  // ≥1 movement (otherwise the dropdown would be cluttered with empty options).
  const productIdsWithMovement = new Set(movements.map((m) => m.productId));
  const productsWithMovements = products
    .filter((p) => productIdsWithMovement.has(p.id))
    .map((p) => ({ id: p.id, name: p.name, sku: p.sku }));

  // T14 NewMovementDialog: user must be able to register the FIRST movement
  // for any product, so the dialog gets the full product list.
  const allProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Movimientos</h1>
        <NewMovementDialog products={allProducts} />
      </div>

      <MovementsFilters
        movements={movements}
        products={productsWithMovements}
        productSkuById={productSkuById}
      />
    </div>
  );
}
