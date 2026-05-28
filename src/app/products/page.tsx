/**
 * Products List Page (/products)
 *
 * Server Component — fetches product data directly via use case and hands it
 * to the client-side <ProductsCatalog /> wrapper, which renders the header
 * (title + Export CSV + New product) and the filter / table client UI.
 */

import { ProductsCatalog } from "@/components/products/ProductsCatalog";
import {
  listProductsUseCase,
  listCategoriesUseCase,
  listStockLevelsUseCase,
  listStockMovementsUseCase,
} from "@infrastructure/container";
import { listSuppliers } from "@interfaces/actions/supplierActions";

interface ProductsPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const [params, products, categories, stockLevels, movements, suppliersResult] =
    await Promise.all([
      searchParams,
      listProductsUseCase.execute({}),
      listCategoriesUseCase.execute(),
      listStockLevelsUseCase.execute(),
      listStockMovementsUseCase.execute({}),
      listSuppliers(),
    ]);

  const stockByProductId: Record<string, number> = {};
  for (const level of stockLevels) {
    stockByProductId[level.productId] = level.quantity;
  }

  const movementCountByProductId: Record<string, number> = {};
  for (const movement of movements) {
    movementCountByProductId[movement.productId] =
      (movementCountByProductId[movement.productId] ?? 0) + 1;
  }

  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));
  const supplierOptions = suppliersResult.success
    ? suppliersResult.data.map((s) => ({ id: s.id, name: s.name }))
    : [];

  return (
    <ProductsCatalog
      products={products}
      categories={categoryOptions}
      suppliers={supplierOptions}
      stockByProductId={stockByProductId}
      movementCountByProductId={movementCountByProductId}
      initialSearch={params.q ?? ""}
    />
  );
}
