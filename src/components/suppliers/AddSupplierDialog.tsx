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
import type { SupplierDTO } from "@application/dtos/SupplierDTO";
import type { ActionResult } from "@interfaces/actions/actionHelpers";
import { createSupplier as defaultCreateSupplier } from "@interfaces/actions/supplierActions";

export interface AddSupplierDialogProps {
  /**
   * Server Action that creates the supplier. Injectable for tests; defaults to
   * the real `createSupplier` Server Action wired to the DI container.
   */
  createSupplierAction?: (input: {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
  }) => Promise<ActionResult<SupplierDTO>>;
  /**
   * Refresh strategy after a successful create. Defaults to `router.refresh()`.
   * Injectable for tests.
   */
  onCreated?: () => void;
}

export function AddSupplierDialog({
  createSupplierAction,
  onCreated,
}: AddSupplierDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );
  const [formError, setFormError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
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

    const action = createSupplierAction ?? defaultCreateSupplier;

    const payload: {
      name: string;
      email?: string;
      phone?: string;
      notes?: string;
    } = { name: name.trim() };
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
        title: "Proveedor creado",
        description: `${result.data.name} se agregó a la lista de proveedores.`,
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
        <Button data-testid="add-supplier-trigger">
          <Plus className="mr-2 h-4 w-4" /> Add supplier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add supplier</DialogTitle>
          <DialogDescription>
            Completá los datos para dar de alta un nuevo proveedor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && (
            <div
              role="alert"
              data-testid="supplier-form-error"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="as-name">Nombre</Label>
            <Input
              id="as-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "as-name-error" : undefined}
              autoComplete="off"
            />
            {fieldErrors.name && (
              <p
                id="as-name-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="as-email">Email</Label>
            <Input
              id="as-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "as-email-error" : undefined}
              autoComplete="off"
            />
            {fieldErrors.email && (
              <p
                id="as-email-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="as-phone">Teléfono</Label>
            <Input
              id="as-phone"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? "as-phone-error" : undefined}
              autoComplete="off"
            />
            {fieldErrors.phone && (
              <p
                id="as-phone-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.phone}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="as-notes">Notas</Label>
            <Textarea
              id="as-notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-invalid={Boolean(fieldErrors.notes)}
              aria-describedby={fieldErrors.notes ? "as-notes-error" : undefined}
              rows={3}
            />
            {fieldErrors.notes && (
              <p
                id="as-notes-error"
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
            <Button type="submit" disabled={isPending} data-testid="as-submit">
              {isPending ? "Creando…" : "Crear proveedor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
