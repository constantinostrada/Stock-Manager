"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  parseProductsCsv,
  type ParsedProductCsvRow,
} from "@/lib/importProductsCsv";
import {
  previewProductsImport as defaultPreviewAction,
  importProducts as defaultImportAction,
} from "@interfaces/actions/productActions";
import type { ActionResult } from "@interfaces/actions/actionHelpers";
import type { ImportProductsResultDTO } from "@application/dtos/ProductDTO";

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, "utf-8");
  });
}

export interface ImportProductsDialogProps {
  /** Test seam — override the dry-run preview Server Action. */
  previewAction?: (input: {
    rows: ParsedProductCsvRow[];
  }) => Promise<ActionResult<ImportProductsResultDTO>>;
  /** Test seam — override the commit Server Action. */
  importAction?: (input: {
    rows: ParsedProductCsvRow[];
  }) => Promise<ActionResult<ImportProductsResultDTO>>;
  /** Refresh strategy after a successful import. Defaults to `router.refresh()`. */
  onImported?: () => void;
}

export function ImportProductsDialog({
  previewAction = defaultPreviewAction,
  importAction = defaultImportAction,
  onImported,
}: ImportProductsDialogProps = {}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [parsedRows, setParsedRows] = React.useState<ParsedProductCsvRow[]>([]);
  const [preview, setPreview] = React.useState<ImportProductsResultDTO | null>(
    null,
  );

  function resetState() {
    setBusy(false);
    setFileError(null);
    setParsedRows([]);
    setPreview(null);
  }

  function handleOpenChange(next: boolean) {
    if (busy) return; // don't close mid-import
    setOpen(next);
    if (!next) resetState();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileError(null);
    setPreview(null);
    setParsedRows([]);
    if (!file) return;

    setBusy(true);
    try {
      const text = await readFileText(file);
      const parsed = parseProductsCsv(text);
      if (!parsed.ok) {
        setFileError(parsed.error);
        return;
      }
      const result = await previewAction({ rows: parsed.rows });
      if (!result.success) {
        setFileError(result.error);
        return;
      }
      setParsedRows(parsed.rows);
      setPreview(result.data);
    } catch {
      setFileError("No se pudo leer el archivo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (busy || !preview || preview.validCount === 0) return;
    setBusy(true);
    try {
      const result = await importAction({ rows: parsedRows });
      if (!result.success) {
        toast({
          title: "No se pudo importar el CSV",
          description: result.error,
        });
        return;
      }
      const { createdCount, errorCount } = result.data;
      toast({
        title: `Importados ${createdCount} productos`,
        ...(errorCount > 0
          ? { description: `${errorCount} filas omitidas por errores.` }
          : {}),
      });
      setOpen(false);
      resetState();
      if (onImported) onImported();
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label="Importar CSV"
          data-testid="import-csv-trigger"
        >
          <Upload className="mr-2 h-4 w-4" /> Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar productos desde CSV</DialogTitle>
          <DialogDescription>
            Subí un archivo CSV con columnas Nombre, SKU y Precio (y
            opcionalmente Categoría, Proveedor, Stock y Stock mínimo). Las
            filas con errores se marcan y no se importan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="import-csv-file">Archivo CSV</Label>
          <Input
            id="import-csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            disabled={busy}
            data-testid="import-csv-file"
          />
        </div>

        {fileError && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            data-testid="import-file-error"
          >
            {fileError}
          </div>
        )}

        {preview && (
          <>
            <p className="text-sm text-muted-foreground" data-testid="import-summary">
              {preview.validCount} filas válidas · {preview.errorCount} con
              errores
            </p>
            <div className="max-h-80 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Fila</th>
                    <th className="px-3 py-2 font-medium">Nombre</th>
                    <th className="px-3 py-2 font-medium">SKU</th>
                    <th className="px-3 py-2 font-medium">Precio</th>
                    <th className="px-3 py-2 font-medium">Categoría</th>
                    <th className="px-3 py-2 font-medium">Proveedor</th>
                    <th className="px-3 py-2 font-medium">Stock</th>
                    <th className="px-3 py-2 font-medium">Mínimo</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={cn(
                        "border-t",
                        !row.valid && "bg-destructive/10",
                      )}
                      data-testid="import-preview-row"
                      data-valid={row.valid}
                    >
                      <td className="px-3 py-2">{row.rowNumber}</td>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2 font-mono">{row.sku}</td>
                      <td className="px-3 py-2">{row.price}</td>
                      <td className="px-3 py-2">{row.categoryName}</td>
                      <td className="px-3 py-2">{row.supplierName}</td>
                      <td className="px-3 py-2">{row.stock}</td>
                      <td className="px-3 py-2">{row.minStock}</td>
                      <td className="px-3 py-2">
                        {row.valid ? (
                          <span className="text-muted-foreground">Válida</span>
                        ) : (
                          <span
                            className="text-destructive"
                            data-testid="import-row-errors"
                          >
                            {row.errors.join(" ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !preview || preview.validCount === 0}
            data-testid="import-confirm"
          >
            {busy
              ? "Importando…"
              : `Importar ${preview?.validCount ?? 0} productos`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
