"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { ActionResult } from "@interfaces/actions/actionHelpers";
import type { StockLevelDTO } from "@application/dtos/StockDTO";
import { createMovement as defaultCreateMovement } from "@interfaces/actions/movementActions";

type Tipo = "ENTRADA" | "SALIDA" | "AJUSTE";

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

export interface NewMovementDialogProps {
  products: ProductOption[];
  /** Injectable for tests; defaults to the real Server Action. */
  createMovementAction?: (input: {
    productId: string;
    tipo: Tipo;
    cantidad: number;
    razon?: string;
  }) => Promise<ActionResult<StockLevelDTO>>;
  /** Callback after a successful registration. Defaults to router.refresh(). */
  onSuccess?: () => void;
}

export function NewMovementDialog({
  products,
  createMovementAction,
  onSuccess,
}: NewMovementDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  const [productId, setProductId] = React.useState("");
  const [tipo, setTipo] = React.useState<Tipo>("ENTRADA");
  const [cantidad, setCantidad] = React.useState("");
  const [razon, setRazon] = React.useState("");

  function resetForm() {
    setProductId("");
    setTipo("ENTRADA");
    setCantidad("");
    setRazon("");
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

    const action = createMovementAction ?? defaultCreateMovement;
    const trimmedRazon = razon.trim();
    const payload: {
      productId: string;
      tipo: Tipo;
      cantidad: number;
      razon?: string;
    } = {
      productId,
      tipo,
      cantidad: Number(cantidad),
    };
    if (trimmedRazon.length > 0) payload.razon = trimmedRazon;

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

      const productName =
        products.find((p) => p.id === result.data.productId)?.name ??
        result.data.productName;
      toast({
        title: "Movimiento registrado",
        description: `${productName}: stock actualizado a ${result.data.quantity}.`,
      });
      setOpen(false);
      resetForm();
      if (onSuccess) onSuccess();
      else router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          data-testid="new-movement-trigger"
        >
          <Plus className="mr-1 h-4 w-4" />
          + Nuevo movimiento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo movimiento</DialogTitle>
          <DialogDescription>
            Registrá una entrada, salida o ajuste manual de stock.
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
            <Label htmlFor="nm-producto">Producto</Label>
            <select
              id="nm-producto"
              data-testid="nm-producto"
              name="productId"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              aria-invalid={Boolean(fieldErrors.productId)}
              aria-describedby={
                fieldErrors.productId ? "nm-producto-error" : undefined
              }
              required
              className="border-input bg-background ring-offset-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
            >
              <option value="" disabled>
                Seleccioná un producto…
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
            {fieldErrors.productId && (
              <p
                id="nm-producto-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.productId}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nm-tipo">Tipo</Label>
            <select
              id="nm-tipo"
              data-testid="nm-tipo"
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as Tipo)}
              aria-invalid={Boolean(fieldErrors.tipo)}
              aria-describedby={fieldErrors.tipo ? "nm-tipo-error" : undefined}
              required
              className="border-input bg-background ring-offset-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
            >
              <option value="ENTRADA">ENTRADA</option>
              <option value="SALIDA">SALIDA</option>
              <option value="AJUSTE">AJUSTE</option>
            </select>
            {fieldErrors.tipo && (
              <p
                id="nm-tipo-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.tipo}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nm-cantidad">Cantidad</Label>
            <Input
              id="nm-cantidad"
              name="cantidad"
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              aria-invalid={Boolean(fieldErrors.cantidad)}
              aria-describedby={
                fieldErrors.cantidad ? "nm-cantidad-error" : undefined
              }
              required
            />
            {fieldErrors.cantidad && (
              <p
                id="nm-cantidad-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.cantidad}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nm-razon">Razón (opcional)</Label>
            <Textarea
              id="nm-razon"
              data-testid="nm-razon"
              name="razon"
              value={razon}
              onChange={(e) => setRazon(e.target.value)}
              aria-invalid={Boolean(fieldErrors.razon)}
              aria-describedby={
                fieldErrors.razon ? "nm-razon-error" : undefined
              }
              maxLength={500}
              placeholder="Compra, venta, ajuste de inventario…"
            />
            {fieldErrors.razon && (
              <p
                id="nm-razon-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.razon}
              </p>
            )}
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
            <Button type="submit" disabled={isPending} data-testid="nm-submit">
              {isPending ? "Guardando…" : "Registrar movimiento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
