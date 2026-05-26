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
    <ProductsCatalog
      products={products}
      categories={categoryOptions}
      stockByProductId={stockByProductId}
    />
  );
}
