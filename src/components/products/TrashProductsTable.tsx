"use client";

import { RestoreProductButton } from "@/components/products/RestoreProductButton";
import { HardDeleteProductButton } from "@/components/products/HardDeleteProductButton";
import type { ProductDTO } from "@application/dtos/ProductDTO";

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

const CURRENCY_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
});

interface TrashProductsTableProps {
  products: ProductDTO[];
}

export function TrashProductsTable({ products }: TrashProductsTableProps) {
  if (products.length === 0) {
    return (
      <div
        data-testid="trash-empty-state"
        className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground"
      >
        <p className="font-medium">Papelera vacía</p>
        <p>No hay productos eliminados.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table
        className="w-full text-sm"
        data-testid="trash-table"
      >
        <thead className="border-b bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Nombre</th>
            <th className="px-3 py-2 font-medium">SKU</th>
            <th className="px-3 py-2 font-medium">Categoría</th>
            <th className="px-3 py-2 font-medium">Proveedor</th>
            <th className="px-3 py-2 text-right font-medium">Precio</th>
            <th className="px-3 py-2 font-medium">Eliminado el</th>
            <th className="px-3 py-2 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const deletedAt = p.deletedAt ? new Date(p.deletedAt) : null;
            return (
              <tr
                key={p.id}
                data-testid="trash-row"
                data-product-id={p.id}
                data-product-sku={p.sku}
                className="border-b last:border-b-0 hover:bg-muted/30"
              >
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {p.categoryName ?? "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {p.supplierName ?? "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {CURRENCY_FORMATTER.format(p.price)}
                </td>
                <td
                  className="px-3 py-2 text-muted-foreground"
                  data-testid={`trash-row-deleted-at-${p.id}`}
                >
                  {deletedAt ? DATE_FORMATTER.format(deletedAt) : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <RestoreProductButton
                      productId={p.id}
                      productName={p.name}
                    />
                    <HardDeleteProductButton
                      productId={p.id}
                      productName={p.name}
                      productSku={p.sku}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
