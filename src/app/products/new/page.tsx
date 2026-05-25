/**
 * New Product Page (/products/new)
 */

import { ProductForm } from "@/components/products/ProductForm";
import { listCategoriesUseCase } from "@infrastructure/container";

export default async function NewProductPage() {
  const categories = await listCategoriesUseCase.execute();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Product</h1>
        <p className="text-muted-foreground mt-1">
          Register a new product SKU in the system.
        </p>
      </div>
      <ProductForm categories={categories} />
    </div>
  );
}
