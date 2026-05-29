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
import { parseSortParam } from "@interfaces/validation/productSchemas";

interface ProductsPageProps {
  searchParams: Promise<{ q?: string; supplierId?: string; sort?: string }>;
}

function normalizeParam(raw: string | string[] | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const params = await searchParams;
  const supplierIdParam = normalizeParam(params.supplierId);
  const qParam = normalizeParam(params.q);
  const sortParam = parseSortParam(normalizeParam(params.sort));

  const [products, categories, stockLevels, movements, suppliersResult] =
    await Promise.all([
      listProductsUseCase.execute({
        ...(qParam !== undefined ? { name: qParam } : {}),
        ...(supplierIdParam !== undefined ? { supplierId: supplierIdParam } : {}),
        ...(sortParam !== undefined ? { sort: sortParam } : {}),
      }),
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
      initialSearch={qParam ?? ""}
      {...(supplierIdParam !== undefined ? { initialSupplierId: supplierIdParam } : {})}
      {...(sortParam !== undefined ? { initialSort: sortParam } : {})}
    />
  );
}
