"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import type { ActionResult } from "@interfaces/actions/actionHelpers";
import type { StockLevelDTO } from "@application/dtos/StockDTO";
import { registerMovement as defaultRegisterMovement } from "@interfaces/actions/movementActions";

export type MovementTipo = "ENTRADA" | "SALIDA";

export interface RegisterMovementDialogProps {
  productId: string;
  productName: string;
  productSku?: string;
  tipo: MovementTipo;
  /** Injectable for tests; defaults to the real Server Action. */
  registerMovementAction?: (input: {
    productId: string;
    tipo: MovementTipo;
    cantidad: number;
    razon: string;
  }) => Promise<ActionResult<StockLevelDTO>>;
  /** Callback after a successful registration. Defaults to router.refresh(). */
  onSuccess?: () => void;
}

export function RegisterMovementDialog({
  productId,
  productName,
  productSku,
  tipo,
  registerMovementAction,
  onSuccess,
}: RegisterMovementDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  const [cantidad, setCantidad] = React.useState("");
  const [razon, setRazon] = React.useState("");

  const isEntrada = tipo === "ENTRADA";
  const Icon = isEntrada ? Plus : Minus;
  const triggerLabel = isEntrada ? "Registrar entrada" : "Registrar salida";
  const triggerTestId = isEntrada
    ? `entrada-trigger-${productId}`
    : `salida-trigger-${productId}`;
  const triggerClass = isEntrada
    ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
    : "border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800";

  function resetForm() {
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

    const action = registerMovementAction ?? defaultRegisterMovement;
    const payload = {
      productId,
      tipo,
      cantidad: Number(cantidad),
      razon: razon.trim(),
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
        title: isEntrada ? "Entrada registrada" : "Salida registrada",
        description: `${productName}: nuevo stock ${result.data.quantity}.`,
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
          variant="outline"
          size="icon"
          aria-label={triggerLabel}
          data-testid={triggerTestId}
          data-tipo={tipo}
          className={triggerClass}
        >
          <Icon className="h-4 w-4" />
          <span className="sr-only">{triggerLabel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEntrada ? "Registrar entrada" : "Registrar salida"}
          </DialogTitle>
          <DialogDescription>
            {productName}
            {productSku ? ` · ${productSku}` : ""}
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
            <Label htmlFor="rm-cantidad">Cantidad</Label>
            <Input
              id="rm-cantidad"
              name="cantidad"
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              aria-invalid={Boolean(fieldErrors.cantidad)}
              aria-describedby={fieldErrors.cantidad ? "rm-cantidad-error" : undefined}
              autoFocus
              required
            />
            {fieldErrors.cantidad && (
              <p
                id="rm-cantidad-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.cantidad}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rm-razon">Razón</Label>
            <Input
              id="rm-razon"
              name="razon"
              type="text"
              placeholder="Venta / Compra / Pérdida / Ajuste / Rotura"
              value={razon}
              onChange={(e) => setRazon(e.target.value)}
              aria-invalid={Boolean(fieldErrors.razon)}
              aria-describedby={fieldErrors.razon ? "rm-razon-error" : undefined}
              autoComplete="off"
              required
            />
            {fieldErrors.razon && (
              <p
                id="rm-razon-error"
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
            <Button type="submit" disabled={isPending} data-testid="rm-submit">
              {isPending
                ? "Guardando…"
                : isEntrada
                  ? "Registrar entrada"
                  : "Registrar salida"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
