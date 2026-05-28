/**
 * Suppliers Page (/suppliers)
 *
 * Server Component — loads suppliers via the use case container and renders
 * the SuppliersTable + AddSupplierDialog trigger. The "productos asociados"
 * column is hard-coded to 0 for now (T18 will wire the Supplier↔Product link).
 */

import { AddSupplierDialog } from "@/components/suppliers/AddSupplierDialog";
import { SuppliersTable } from "@/components/suppliers/SuppliersTable";
import { listSuppliersUseCase } from "@infrastructure/container";

export default async function SuppliersPage() {
  const suppliers = await listSuppliersUseCase.execute();

  const productCountBySupplierId: Record<string, number> = {};
  for (const s of suppliers) {
    productCountBySupplierId[s.id] = 0;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Proveedores</h1>
          <p className="text-sm text-muted-foreground">
            Administra los proveedores que abastecen tu catálogo.
          </p>
        </div>
        <AddSupplierDialog />
      </div>

      <SuppliersTable
        suppliers={suppliers}
        productCountBySupplierId={productCountBySupplierId}
      />
    </div>
  );
}
