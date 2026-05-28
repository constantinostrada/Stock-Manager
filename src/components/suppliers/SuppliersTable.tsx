import type { SupplierDTO } from "@application/dtos/SupplierDTO";
import { EditSupplierDialog } from "@/components/suppliers/EditSupplierDialog";

export interface SuppliersTableProps {
  suppliers: SupplierDTO[];
  /** Number of products associated to each supplier, keyed by supplier id. */
  productCountBySupplierId?: Record<string, number>;
}

export function SuppliersTable({
  suppliers,
  productCountBySupplierId = {},
}: SuppliersTableProps) {
  if (suppliers.length === 0) {
    return (
      <div
        data-testid="suppliers-empty-state"
        className="rounded-md border bg-muted/40 p-6 text-center text-sm text-muted-foreground"
      >
        No hay proveedores cargados todavía.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="min-w-[640px] w-full text-sm" data-testid="suppliers-table">
        <thead className="bg-muted sticky top-0 z-10">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Nombre</th>
            <th className="px-4 py-2 text-left font-medium">Email</th>
            <th className="px-4 py-2 text-left font-medium">Teléfono</th>
            <th className="px-4 py-2 text-right font-medium">
              Productos asociados
            </th>
            <th className="px-4 py-2 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier) => {
            const count = productCountBySupplierId[supplier.id] ?? 0;
            return (
              <tr
                key={supplier.id}
                data-testid="supplier-row"
                data-supplier-id={supplier.id}
                className="odd:bg-background even:bg-muted/30"
              >
                <td className="px-4 py-2 font-medium">{supplier.name}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {supplier.email ?? "—"}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {supplier.phone ?? "—"}
                </td>
                <td
                  className="px-4 py-2 text-right tabular-nums"
                  data-testid="supplier-product-count"
                >
                  {count}
                </td>
                <td
                  className="px-4 py-2 text-right"
                  data-testid="supplier-row-actions"
                >
                  <EditSupplierDialog supplier={supplier} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
