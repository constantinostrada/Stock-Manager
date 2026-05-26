/**
 * Products List Page (/products)
 *
 * Server Component — fetches product data directly via use case and hands it
 * to the client-side <ProductsFilters /> component, which does all the
 * search / category / stock-level filtering in the browser (no round-trip).
 */

import { NewProductDialog } from "@/components/products/NewProductDialog";
import { ProductsFilters } from "@/components/products/ProductsFilters";
import {
  listProductsUseCase,
  listCategoriesUseCase,
  listStockLevelsUseCase,
} from "@infrastructure/container";

export default async function ProductsPage() {
  const [products, categories, stockLevels] = await Promise.all([
    listProductsUseCase.execute({}),
    listCategoriesUseCase.execute(),
    listStockLevelsUseCase.execute(),
  ]);

  const stockByProductId: Record<string, number> = {};
  for (const level of stockLevels) {
    stockByProductId[level.productId] = level.quantity;
  }

  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between" data-testid="products-header">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        </div>
        <NewProductDialog categories={categoryOptions} />
      </div>

      <ProductsFilters
        products={products}
        categories={categoryOptions}
        stockByProductId={stockByProductId}
      />
    </div>
  );
}
