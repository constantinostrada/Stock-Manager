"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
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
import type { SupplierDTO } from "@application/dtos/SupplierDTO";
import type { ActionResult } from "@interfaces/actions/actionHelpers";
import { updateSupplier as defaultUpdateSupplier } from "@interfaces/actions/supplierActions";

export interface EditSupplierDialogProps {
  supplier: SupplierDTO;
  /**
   * Server Action that updates the supplier. Injectable for tests; defaults to
   * the real `updateSupplier` Server Action wired to the DI container.
   */
  updateSupplierAction?: (input: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
  }) => Promise<ActionResult<SupplierDTO>>;
  /** Refresh strategy after a successful update. Defaults to `router.refresh()`. */
  onUpdated?: () => void;
}

export function EditSupplierDialog({
  supplier,
  updateSupplierAction,
  onUpdated,
}: EditSupplierDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );
  const [formError, setFormError] = React.useState<string | null>(null);

  const [name, setName] = React.useState(supplier.name);
  const [email, setEmail] = React.useState(supplier.email ?? "");
  const [phone, setPhone] = React.useState(supplier.phone ?? "");
  const [notes, setNotes] = React.useState(supplier.notes ?? "");

  function resetForm() {
    setName(supplier.name);
    setEmail(supplier.email ?? "");
    setPhone(supplier.phone ?? "");
    setNotes(supplier.notes ?? "");
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

    const action = updateSupplierAction ?? defaultUpdateSupplier;

    const payload: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      notes?: string;
    } = { id: supplier.id, name: name.trim() };
    if (email.trim()) payload.email = email.trim();
    if (phone.trim()) payload.phone = phone.trim();
    if (notes.trim()) payload.notes = notes.trim();

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
        title: "Proveedor actualizado",
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
          data-testid={`edit-supplier-trigger-${supplier.id}`}
          aria-label={`Editar ${supplier.name}`}
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Editar</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar proveedor</DialogTitle>
          <DialogDescription>
            Modificá los datos del proveedor seleccionado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && (
            <div
              role="alert"
              data-testid="supplier-edit-form-error"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="es-name">Nombre</Label>
            <Input
              id="es-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "es-name-error" : undefined}
              autoComplete="off"
            />
            {fieldErrors.name && (
              <p
                id="es-name-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="es-email">Email</Label>
            <Input
              id="es-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "es-email-error" : undefined}
              autoComplete="off"
            />
            {fieldErrors.email && (
              <p
                id="es-email-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="es-phone">Teléfono</Label>
            <Input
              id="es-phone"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? "es-phone-error" : undefined}
              autoComplete="off"
            />
            {fieldErrors.phone && (
              <p
                id="es-phone-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.phone}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="es-notes">Notas</Label>
            <Textarea
              id="es-notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-invalid={Boolean(fieldErrors.notes)}
              aria-describedby={fieldErrors.notes ? "es-notes-error" : undefined}
              rows={3}
            />
            {fieldErrors.notes && (
              <p
                id="es-notes-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.notes}
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
            <Button type="submit" disabled={isPending} data-testid="es-submit">
              {isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
