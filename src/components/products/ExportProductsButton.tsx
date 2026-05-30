"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { triggerCsvDownload } from "@/lib/exportProductsCsv";
import { exportProducts as defaultExportAction } from "@interfaces/actions/productActions";
import type { ActionResult } from "@interfaces/actions/actionHelpers";

interface ExportResult {
  filename: string;
  content: string;
}

export interface ExportProductsButtonProps {
  /** Test seam — override the Server Action call. */
  exportAction?: (input: {
    name?: string;
    sort?: string;
  }) => Promise<ActionResult<ExportResult>>;
  /** Test seam — override the DOM download trigger. */
  download?: (filename: string, content: string) => void;
}

export function ExportProductsButton({
  exportAction = defaultExportAction,
  download = triggerCsvDownload,
}: ExportProductsButtonProps = {}) {
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const q = searchParams?.get("q") ?? undefined;
      const sort = searchParams?.get("sort") ?? undefined;
      const payload: { name?: string; sort?: string } = {};
      if (q !== undefined && q.length > 0) payload.name = q;
      if (sort !== undefined && sort.length > 0) payload.sort = sort;

      const result = await exportAction(payload);
      if (!result.success) {
        toast({
          title: "No se pudo exportar el CSV",
          description: result.error,
        });
        return;
      }
      download(result.data.filename, result.data.content);
      const rows = Math.max(
        0,
        result.data.content.split("\r\n").length - 1, // minus header
      );
      toast({ title: `Exportado · ${rows} productos` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={busy}
      aria-label="Exportar CSV"
      data-testid="export-csv-trigger"
    >
      <Download className="mr-2 h-4 w-4" /> Exportar CSV
    </Button>
  );
}
