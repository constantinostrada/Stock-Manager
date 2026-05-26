"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  buildProductsCsv,
  csvFilenameFor,
  triggerCsvDownload,
} from "@/lib/exportProductsCsv";
import type { ProductDTO } from "@application/dtos/ProductDTO";

export interface ExportProductsButtonProps {
  products: ProductDTO[];
  stockByProductId?: Record<string, number>;
  download?: (filename: string, content: string) => void;
  now?: () => Date;
}

const DISABLED_TOOLTIP = "No hay productos para exportar";

export function ExportProductsButton({
  products,
  stockByProductId = {},
  download = triggerCsvDownload,
  now = () => new Date(),
}: ExportProductsButtonProps) {
  const empty = products.length === 0;

  function handleClick() {
    if (empty) return;
    const csv = buildProductsCsv(products, stockByProductId);
    const filename = csvFilenameFor(now());
    download(filename, csv);
    toast({
      title: `Exportado · ${products.length} productos`,
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={empty}
      title={empty ? DISABLED_TOOLTIP : undefined}
      aria-label="Exportar CSV"
      data-testid="export-csv-trigger"
    >
      <Download className="mr-2 h-4 w-4" /> Exportar CSV
    </Button>
  );
}
