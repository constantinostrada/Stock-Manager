/**
 * Papelera de productos (/products/trash)
 *
 * Server Component — fetches the soft-deleted products via the use case and
 * hands them to the TrashProductsTable client component. Provides Restore and
 * Eliminar permanentemente actions per row.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TrashProductsTable } from "@/components/products/TrashProductsTable";
import { listDeletedProductsUseCase } from "@infrastructure/container";

export default async function TrashPage() {
  const products = await listDeletedProductsUseCase.execute();
  const count = products.length;

  const subtitle =
    count === 0
      ? "No hay productos eliminados."
      : count === 1
        ? "1 producto eliminado."
        : `${count} productos eliminados.`;

  return (
    <div data-testid="trash-page" className="space-y-4">
      <Link
        href="/products"
        data-testid="back-to-products"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Papelera</h1>
        <p
          data-testid="trash-subtitle"
          className="text-sm text-muted-foreground"
        >
          {subtitle}
        </p>
      </div>
      <TrashProductsTable products={products} />
    </div>
  );
}
