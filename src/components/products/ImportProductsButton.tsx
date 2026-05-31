"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
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
import { importProducts as defaultImportAction } from "@interfaces/actions/productActions";
import type { ActionResult } from "@interfaces/actions/actionHelpers";
import type { ImportProductsCsvResultDTO } from "@application/use-cases/product/ImportProductsCsvUseCase";

export interface ImportProductsButtonProps {
  /** Test seam — override the Server Action call. */
  importAction?: (input: {
    csvText: string;
    mode: "dry-run" | "commit";
  }) => Promise<ActionResult<ImportProductsCsvResultDTO>>;
  /**
   * Test seam — override how a File is decoded to text. The default uses the
   * `File.prototype.text()` browser API, which is not implemented by jsdom.
   */
  readFile?: (file: File) => Promise<string>;
  /** Test seam — override the post-commit refresh strategy. */
  onCommitted?: () => void;
}

const defaultReadFile = (file: File): Promise<string> => file.text();

export function ImportProductsButton({
  importAction = defaultImportAction,
  readFile = defaultReadFile,
  onCommitted,
}: ImportProductsButtonProps = {}) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const csvTextRef = React.useRef<string | null>(null);
  const [preview, setPreview] =
    React.useState<ImportProductsCsvResultDTO | null>(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  function triggerFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the value so the same file can be re-selected later.
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    try {
      const csvText = await readFile(file);
      csvTextRef.current = csvText;
      const result = await importAction({ csvText, mode: "dry-run" });
      if (!result.success) {
        toast({
          title: "No se pudo leer el CSV",
          description: result.error,
        });
        csvTextRef.current = null;
        return;
      }
      setPreview(result.data);
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    setOpen(false);
    setPreview(null);
    csvTextRef.current = null;
  }

  async function handleConfirm() {
    if (!csvTextRef.current || !preview) return;
    setBusy(true);
    try {
      const result = await importAction({
        csvText: csvTextRef.current,
        mode: "commit",
      });
      if (!result.success) {
        toast({
          title: "Falló la importación",
          description: result.error,
        });
        return;
      }
      const { createdCount, updatedCount } = result.data.summary;
      toast({
        title: `Importado · ${createdCount} creados, ${updatedCount} actualizados`,
      });
      setOpen(false);
      setPreview(null);
      csvTextRef.current = null;
      if (onCommitted) onCommitted();
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function handleDialogOpenChange(next: boolean) {
    if (busy) return;
    if (!next) handleCancel();
  }

  const fileError = preview?.fileError ?? null;
  const validRows = preview?.valid ?? [];
  const invalidRows = preview?.invalid ?? [];

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        data-testid="import-csv-file-input"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        onClick={triggerFilePicker}
        disabled={busy}
        aria-label="Importar CSV"
        data-testid="import-csv-trigger"
      >
        <Upload className="mr-2 h-4 w-4" /> Importar CSV
      </Button>

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="max-w-3xl"
          data-testid="import-csv-preview-dialog"
        >
          <DialogHeader>
            <DialogTitle>Vista previa de la importación</DialogTitle>
            <DialogDescription>
              Revisá las filas detectadas antes de confirmar. La importación no
              se aplica hasta que confirmes.
            </DialogDescription>
          </DialogHeader>

          {fileError && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              data-testid="import-csv-file-error"
            >
              {fileError}
            </div>
          )}

          {!fileError && preview && (
            <div className="space-y-4">
              <div
                className="flex flex-wrap gap-3 text-sm text-muted-foreground"
                data-testid="import-csv-summary"
              >
                <span>Total: {preview.summary.totalRows}</span>
                <span data-testid="import-csv-valid-count">
                  Válidas: {preview.summary.validCount}
                </span>
                <span data-testid="import-csv-invalid-count">
                  Con errores: {preview.summary.invalidCount}
                </span>
              </div>

              {validRows.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  <table className="w-full text-sm" data-testid="import-csv-valid-table">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-2 py-1 text-left">Fila</th>
                        <th className="px-2 py-1 text-left">Acción</th>
                        <th className="px-2 py-1 text-left">SKU</th>
                        <th className="px-2 py-1 text-left">Nombre</th>
                        <th className="px-2 py-1 text-right">Precio</th>
                        <th className="px-2 py-1 text-right">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.map((r) => (
                        <tr
                          key={`v-${r.rowNumber}`}
                          data-testid={`import-csv-valid-row-${r.rowNumber}`}
                        >
                          <td className="px-2 py-1">{r.rowNumber}</td>
                          <td className="px-2 py-1">{r.action}</td>
                          <td className="px-2 py-1">{r.sku}</td>
                          <td className="px-2 py-1">{r.name}</td>
                          <td className="px-2 py-1 text-right">
                            {r.price.toFixed(2)}
                          </td>
                          <td className="px-2 py-1 text-right">{r.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {invalidRows.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-md border border-destructive/30">
                  <table
                    className="w-full text-sm"
                    data-testid="import-csv-invalid-table"
                  >
                    <thead className="bg-destructive/10">
                      <tr>
                        <th className="px-2 py-1 text-left">Fila</th>
                        <th className="px-2 py-1 text-left">SKU</th>
                        <th className="px-2 py-1 text-left">Errores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invalidRows.map((r) => (
                        <tr
                          key={`e-${r.rowNumber}`}
                          data-testid={`import-csv-invalid-row-${r.rowNumber}`}
                        >
                          <td className="px-2 py-1 align-top">{r.rowNumber}</td>
                          <td className="px-2 py-1 align-top">{r.raw.sku}</td>
                          <td className="px-2 py-1 text-destructive">
                            <ul className="list-inside list-disc space-y-0.5">
                              {r.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={busy}
              data-testid="import-csv-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={
                busy ||
                Boolean(fileError) ||
                (preview?.summary.validCount ?? 0) === 0
              }
              data-testid="import-csv-confirm"
            >
              {busy ? "Importando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
