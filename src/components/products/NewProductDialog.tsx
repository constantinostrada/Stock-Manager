"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import type { ActionResult } from "@interfaces/actions/actionHelpers";
import type { ProductDTO } from "@application/dtos/ProductDTO";
import { createProduct as defaultCreateProduct } from "@interfaces/actions/productActions";

const NO_CATEGORY = "__none__";

export interface NewProductDialogProps {
  categories: Pick<CategoryDTO, "id" | "name">[];
  /**
   * Server Action that creates the product. Injectable for tests; defaults to
   * the real `createProduct` Server Action wired to the DI container.
   */
  createProductAction?: (input: {
    sku: string;
    name: string;
    categoryId?: string;
    stockInicial: number;
    price: number;
  }) => Promise<ActionResult<ProductDTO>>;
  /**
   * Refresh strategy after a successful create. Defaults to `router.refresh()`.
   * Injectable for tests.
   */
  onCreated?: () => void;
}

export function NewProductDialog({
  categories,
  createProductAction,
  onCreated,
}: NewProductDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  // Controlled inputs so we can reset cleanly on close.
  const [sku, setSku] = React.useState("");
  const [name, setName] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string>(NO_CATEGORY);
  const [stockInicial, setStockInicial] = React.useState("0");
  const [price, setPrice] = React.useState("");

  function resetForm() {
    setSku("");
    setName("");
    setCategoryId(NO_CATEGORY);
    setStockInicial("0");
    setPrice("");
    setFieldErrors({});
    setFormError(null);
  }

  function handleOpenChange(next: boolean) {
    if (isPending) return; // don't close mid-submit
    setOpen(next);
    if (!next) resetForm();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const action = createProductAction ?? defaultCreateProduct;

    const payload = {
      sku: sku.trim(),
      name: name.trim(),
      categoryId: categoryId === NO_CATEGORY ? undefined : categoryId,
      stockInicial: Number(stockInicial),
      price: Number(price),
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
        title: "Producto creado",
        description: `${result.data.name} se agregó al catálogo.`,
      });
      setOpen(false);
      resetForm();
      if (onCreated) onCreated();
      else router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="new-product-trigger">
          <Plus className="mr-2 h-4 w-4" /> Nuevo producto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
          <DialogDescription>
            Completá los datos para dar de alta un nuevo producto en el catálogo.
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
            <Label htmlFor="np-sku">SKU</Label>
            <Input
              id="np-sku"
              name="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              aria-invalid={Boolean(fieldErrors.sku)}
              aria-describedby={fieldErrors.sku ? "np-sku-error" : undefined}
              autoComplete="off"
            />
            {fieldErrors.sku && (
              <p
                id="np-sku-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.sku}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="np-name">Nombre</Label>
            <Input
              id="np-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "np-name-error" : undefined}
              autoComplete="off"
            />
            {fieldErrors.name && (
              <p
                id="np-name-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="np-category">Categoría</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="np-category" aria-label="Categoría">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="np-stock">Stock inicial</Label>
              <Input
                id="np-stock"
                name="stockInicial"
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                value={stockInicial}
                onChange={(e) => setStockInicial(e.target.value)}
                aria-invalid={Boolean(fieldErrors.stockInicial)}
                aria-describedby={
                  fieldErrors.stockInicial ? "np-stock-error" : undefined
                }
              />
              {fieldErrors.stockInicial && (
                <p
                  id="np-stock-error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {fieldErrors.stockInicial}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np-price">Precio</Label>
              <Input
                id="np-price"
                name="price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-invalid={Boolean(fieldErrors.price)}
                aria-describedby={
                  fieldErrors.price ? "np-price-error" : undefined
                }
              />
              {fieldErrors.price && (
                <p
                  id="np-price-error"
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
            <Button type="submit" disabled={isPending} data-testid="np-submit">
              {isPending ? "Creando…" : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

