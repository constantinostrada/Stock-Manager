"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { CategoryDTO } from "@application/dtos/CategoryDTO";
import type { SupplierDTO } from "@application/dtos/SupplierDTO";
import type { ActionResult } from "@interfaces/actions/actionHelpers";
import type { ProductDTO } from "@application/dtos/ProductDTO";
import { updateProduct as defaultUpdateProduct } from "@interfaces/actions/productActions";

const NO_CATEGORY = "__none__";
const NO_SUPPLIER = "__no_supplier__";

export interface EditProductDialogProps {
  product: ProductDTO;
  /** Current stock quantity for the product. Rendered read-only. */
  currentStock?: number;
  categories: Pick<CategoryDTO, "id" | "name">[];
  suppliers?: Pick<SupplierDTO, "id" | "name">[];
  /**
   * Server Action that updates the product. Injectable for tests; defaults to
   * the real `updateProduct` Server Action wired to the DI container.
   */
  updateProductAction?: (input: {
    id: string;
    name: string;
    categoryId: string | null;
    supplierId: string | null;
    price: number;
    currency?: string;
  }) => Promise<ActionResult<ProductDTO>>;
  /** Refresh strategy after a successful update. Defaults to `router.refresh()`. */
  onUpdated?: () => void;
}

export function EditProductDialog({
  product,
  currentStock = 0,
  categories,
  suppliers = [],
  updateProductAction,
  onUpdated,
}: EditProductDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  const initialCategoryId = product.categoryId ?? NO_CATEGORY;
  const initialSupplierId = product.supplierId ?? NO_SUPPLIER;

  const [name, setName] = React.useState(product.name);
  const [categoryId, setCategoryId] = React.useState<string>(initialCategoryId);
  const [supplierId, setSupplierId] = React.useState<string>(initialSupplierId);
  const [price, setPrice] = React.useState(String(product.price));

  function resetForm() {
    setName(product.name);
    setCategoryId(initialCategoryId);
    setSupplierId(initialSupplierId);
    setPrice(String(product.price));
    setFieldErrors({});
    setFormError(null);
  }

  function handleOpenChange(next: boolean) {
    if (isPending) return;
    setOpen(next);
    if (!next) resetForm();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const action = updateProductAction ?? defaultUpdateProduct;

    const payload = {
      id: product.id,
      name: name.trim(),
      categoryId: categoryId === NO_CATEGORY ? null : categoryId,
      supplierId: supplierId === NO_SUPPLIER ? null : supplierId,
      price: Number(price),
      currency: product.currency,
    };

    startTransition(async () => {
      const result = await action(payload);

      if (!result.success) {
        if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
          setFieldErrors(result.fieldErrors);
        } else {
          setFormError(result.error);
        }
        return;
      }

      toast({
        title: "Producto actualizado",
        description: `${result.data.name} se actualizó correctamente.`,
      });
      setOpen(false);
      if (onUpdated) onUpdated();
      else router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid={`edit-product-trigger-${product.id}`}
          aria-label={`Editar ${product.name}`}
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Editar</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar producto</DialogTitle>
          <DialogDescription>
            Modificá los datos del producto. El SKU y el stock no pueden editarse aquí.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ep-sku">SKU</Label>
            <Input
              id="ep-sku"
              name="sku"
              value={product.sku}
              readOnly
              disabled
              data-testid="ep-sku"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-name">Nombre</Label>
            <Input
              id="ep-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "ep-name-error" : undefined}
              autoComplete="off"
            />
            {fieldErrors.name && (
              <p
                id="ep-name-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-category">Categoría</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="ep-category" aria-label="Categoría">
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.categoryId && (
              <p role="alert" className="text-xs text-destructive">
                {fieldErrors.categoryId}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-supplier">Proveedor</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger
                id="ep-supplier"
                aria-label="Proveedor"
                data-testid="ep-supplier"
              >
                <SelectValue placeholder="Sin proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SUPPLIER}>Sin proveedor</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.supplierId && (
              <p role="alert" className="text-xs text-destructive">
                {fieldErrors.supplierId}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ep-stock">Stock actual</Label>
              <Input
                id="ep-stock"
                name="stockActual"
                type="number"
                value={currentStock}
                readOnly
                disabled
                data-testid="ep-stock"
              />
              <p className="text-muted-foreground text-xs">
                Cambiá el stock vía movimientos.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-price">Precio</Label>
              <Input
                id="ep-price"
                name="price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-invalid={Boolean(fieldErrors.price)}
                aria-describedby={
                  fieldErrors.price ? "ep-price-error" : undefined
                }
              />
              {fieldErrors.price && (
                <p
                  id="ep-price-error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {fieldErrors.price}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} data-testid="ep-submit">
              {isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
