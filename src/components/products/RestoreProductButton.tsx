"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { restoreProduct as defaultRestoreProduct } from "@interfaces/actions/productActions";
import type { ActionResult } from "@interfaces/actions/actionHelpers";

export interface RestoreProductButtonProps {
  productId: string;
  productName: string;
  restoreProductAction?: (
    input: { id: string },
  ) => Promise<ActionResult<void>>;
  onRestored?: () => void;
}

export function RestoreProductButton({
  productId,
  productName,
  restoreProductAction,
  onRestored,
}: RestoreProductButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function handleClick() {
    const action = restoreProductAction ?? defaultRestoreProduct;
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
      toast({
        title: "Producto restaurado",
        description: productName,
      });
      if (onRestored) onRestored();
      else router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      data-testid={`restore-product-trigger-${productId}`}
      aria-label={`Restaurar ${productName}`}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          Restaurando…
        </>
      ) : (
        <>
          <RotateCcw className="mr-1 h-4 w-4" />
          Restaurar
        </>
      )}
    </Button>
  );
}
