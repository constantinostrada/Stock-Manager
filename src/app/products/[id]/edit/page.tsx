/**
 * Edit Product Page (/products/[id]/edit)
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/products/ProductForm";
import { getProductUseCase, listCategoriesUseCase } from "@infrastructure/container";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    getProductUseCase.execute({ id }).catch(() => null),
    listCategoriesUseCase.execute(),
  ]);

  if (!product) return notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/products/${id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
          <p className="text-muted-foreground mt-1">{product.name}</p>
        </div>
      </div>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
