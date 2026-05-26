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
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { deleteProduct as defaultDeleteProduct } from "@interfaces/actions/productActions";
import type { ActionResult } from "@interfaces/actions/actionHelpers";

export interface DeleteProductButtonProps {
  productId: string;
  productName: string;
  productSku: string;
  /**
   * Number of stock movements associated with the product. Computed server-side
   * and threaded through as a prop. If 0, the movements clause is omitted from
   * the confirmation message and toast.
   */
  movementCount?: number;
  /**
   * Server Action that deletes the product. Injectable for tests; defaults to
   * the real `deleteProduct` Server Action wired to the DI container.
   */
  deleteProductAction?: (
    input: { id: string },
  ) => Promise<ActionResult<void>>;
  /** Refresh strategy after a successful delete. Defaults to `router.refresh()`. */
  onDeleted?: () => void;
}

export function DeleteProductButton({
  productId,
  productName,
  productSku,
  movementCount = 0,
  deleteProductAction,
  onDeleted,
}: DeleteProductButtonProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function handleOpenChange(next: boolean) {
    if (isPending) return;
    setOpen(next);
  }

  function handleDelete() {
    const action = deleteProductAction ?? defaultDeleteProduct;
    startTransition(async () => {
      const result = await action({ id: productId });
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
        return;
      }
      setOpen(false);
      toast({
        title: "Producto eliminado",
        description:
          movementCount > 0
            ? `${productName} · ${movementCount} movimiento${
                movementCount === 1 ? "" : "s"
              } también`
            : productName,
      });
      if (onDeleted) onDeleted();
      else router.refresh();
    });
  }

  const movementsClause =
    movementCount > 0
      ? ` Esta acción no se puede deshacer y eliminará también ${movementCount} movimiento${
          movementCount === 1 ? "" : "s"
        } asociado${movementCount === 1 ? "" : "s"}.`
      : " Esta acción no se puede deshacer.";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          data-testid={`delete-product-trigger-${productId}`}
          aria-label={`Eliminar ${productName}`}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Eliminar</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar producto</DialogTitle>
          <DialogDescription data-testid="delete-product-message">
            {`¿Eliminar '${productName}' (SKU ${productSku})?${movementsClause}`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
            data-testid="delete-product-submit"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Eliminando…
              </>
            ) : (
              "Eliminar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
