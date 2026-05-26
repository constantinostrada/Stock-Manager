"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { deleteProductsBulk as defaultDeleteProductsBulk } from "@interfaces/actions/productActions";
import type { ActionResult } from "@interfaces/actions/actionHelpers";
import type { DeleteProductsBulkResultDTO } from "@application/dtos/ProductDTO";

export interface BulkDeleteBarProps {
  selectedSkus: string[];
  onClear: () => void;
  /**
   * Server Action that deletes products in bulk. Injectable for tests; defaults
   * to the real `deleteProductsBulk` Server Action wired to the DI container.
   */
  deleteProductsBulkAction?: (
    input: { skus: string[] },
  ) => Promise<ActionResult<DeleteProductsBulkResultDTO>>;
  /** Refresh strategy after a successful delete. Defaults to `router.refresh()`. */
  onDeleted?: () => void;
}

export function BulkDeleteBar({
  selectedSkus,
  onClear,
  deleteProductsBulkAction,
  onDeleted,
}: BulkDeleteBarProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const count = selectedSkus.length;

  if (count === 0) return null;

  const countLabel =
    count === 1
      ? "1 producto seleccionado"
      : `${count} productos seleccionados`;

  const confirmMessage =
    count === 1
      ? "¿Eliminar 1 producto? Esta acción no se puede deshacer."
      : `¿Eliminar ${count} productos? Esta acción no se puede deshacer.`;

  function handleOpenChange(next: boolean) {
    if (isPending) return;
    setOpen(next);
  }

  function handleConfirm() {
    const action = deleteProductsBulkAction ?? defaultDeleteProductsBulk;
    startTransition(async () => {
      const result = await action({ skus: selectedSkus });
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
        return;
      }
      setOpen(false);
      onClear();
      toast({
        title: "Productos eliminados",
        description:
          count === 1
            ? "1 producto eliminado."
            : `${count} productos eliminados.`,
      });
      if (onDeleted) onDeleted();
      else router.refresh();
    });
  }

  return (
    <>
      <div
        data-testid="bulk-delete-bar"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <p
            data-testid="bulk-selection-count"
            className="text-sm font-medium"
          >
            {countLabel}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClear}
              data-testid="bulk-clear-selection"
            >
              Cancelar selección
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setOpen(true)}
              data-testid="bulk-delete-trigger"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar productos</DialogTitle>
            <DialogDescription data-testid="bulk-delete-message">
              {confirmMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
              data-testid="bulk-delete-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
              data-testid="bulk-delete-submit"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Eliminando…
                </>
              ) : (
                "Confirmar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
