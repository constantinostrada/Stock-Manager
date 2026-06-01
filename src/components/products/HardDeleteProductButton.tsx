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
import { hardDeleteProduct as defaultHardDeleteProduct } from "@interfaces/actions/productActions";
import type { ActionResult } from "@interfaces/actions/actionHelpers";

export interface HardDeleteProductButtonProps {
  productId: string;
  productName: string;
  productSku: string;
  hardDeleteProductAction?: (
    input: { id: string },
  ) => Promise<ActionResult<void>>;
  onDeleted?: () => void;
}

export function HardDeleteProductButton({
  productId,
  productName,
  productSku,
  hardDeleteProductAction,
  onDeleted,
}: HardDeleteProductButtonProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function handleOpenChange(next: boolean) {
    if (isPending) return;
    setOpen(next);
  }

  function handleDelete() {
    const action = hardDeleteProductAction ?? defaultHardDeleteProduct;
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
        title: "Producto eliminado permanentemente",
        description: productName,
      });
      if (onDeleted) onDeleted();
      else router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          data-testid={`hard-delete-product-trigger-${productId}`}
          aria-label={`Eliminar permanentemente ${productName}`}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Eliminar permanentemente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar permanentemente</DialogTitle>
          <DialogDescription data-testid="hard-delete-product-message">
            {`¿Eliminar permanentemente '${productName}' (SKU ${productSku})? Esta acción no se puede deshacer y borrará también sus movimientos y niveles de stock asociados en cascada.`}
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
            data-testid="hard-delete-product-submit"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Eliminando…
              </>
            ) : (
              "Eliminar permanentemente"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
