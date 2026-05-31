/**
 * T29 — ImportProductsButton.
 *
 * AC-1: lives in the /products header next to "Exportar CSV".
 * AC-3: preview modal shows valid + invalid rows.
 * AC-4: operator cancels or confirms.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportProductsButton } from "@/components/products/ImportProductsButton";
import { ProductsCatalog } from "@/components/products/ProductsCatalog";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@interfaces/actions/productActions", () => ({
  importProducts: vi.fn(),
  exportProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  deleteProductsBulk: vi.fn(),
  getProductBySku: vi.fn(),
}));

const SAMPLE_PREVIEW = {
  mode: "dry-run" as const,
  fileError: null,
  valid: [
    {
      rowNumber: 2,
      action: "create" as const,
      sku: "SKU-1",
      name: "Mouse",
      description: null,
      price: 25.5,
      categoryName: null,
      supplierName: null,
      quantity: 10,
      minQuantity: 2,
    },
  ],
  invalid: [
    {
      rowNumber: 3,
      errors: ["El precio no es numérico: \"abc\"."],
      raw: {
        sku: "SKU-2",
        name: "Bad",
        description: "",
        price: "abc",
        categoryName: "",
        supplierName: "",
        quantity: "1",
        minQuantity: "0",
      },
    },
  ],
  summary: {
    totalRows: 2,
    validCount: 1,
    invalidCount: 1,
    createdCount: 0,
    updatedCount: 0,
    movementsLogged: 0,
  },
};

describe("ImportProductsButton — T29", () => {
  it("AC-1: trigger renders next to 'Exportar CSV' in the /products header", () => {
    const stableSuppliers: Array<{ id: string; name: string }> = [];
    const stableStock: Record<string, number> = {};
    render(
      <ProductsCatalog
        products={[]}
        categories={[{ id: "c1", name: "C1" }]}
        suppliers={stableSuppliers}
        stockByProductId={stableStock}
      />,
    );
    const header = screen.getByTestId("products-header");
    const importBtn = within(header).getByTestId("import-csv-trigger");
    const exportBtn = within(header).getByTestId("export-csv-trigger");
    expect(importBtn).toBeInTheDocument();
    expect(exportBtn).toBeInTheDocument();
    // Same flex container — placed side-by-side.
    expect(importBtn.parentElement).toBe(exportBtn.parentElement);
  });

  it("AC-3: after uploading a CSV, opens preview modal with valid and invalid rows", async () => {
    const user = userEvent.setup();
    const importAction = vi.fn().mockResolvedValue({
      success: true,
      data: SAMPLE_PREVIEW,
    });

    render(
      <ImportProductsButton
        importAction={importAction}
        readFile={async () => "csv-text"}
      />,
    );

    const file = new File(
      ["sku,name,description,price,categoryName,supplierName,quantity,minQuantity\nSKU-1,Mouse,,25.5,,,10,2"],
      "products.csv",
      { type: "text/csv" },
    );
    const input = screen.getByTestId("import-csv-file-input") as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByTestId("import-csv-preview-dialog")).toBeInTheDocument();
    });

    // dry-run call (no commit) happened first.
    expect(importAction).toHaveBeenCalledTimes(1);
    expect(importAction.mock.calls[0]![0].mode).toBe("dry-run");

    // Both tables are present in the preview.
    expect(screen.getByTestId("import-csv-valid-table")).toBeInTheDocument();
    expect(screen.getByTestId("import-csv-invalid-table")).toBeInTheDocument();
    expect(screen.getByTestId("import-csv-valid-row-2")).toBeInTheDocument();
    expect(screen.getByTestId("import-csv-invalid-row-3")).toHaveTextContent(
      /precio no es numérico/i,
    );
  });

  it("AC-4: operator can cancel — dialog closes and no commit is sent", async () => {
    const user = userEvent.setup();
    const importAction = vi.fn().mockResolvedValue({
      success: true,
      data: SAMPLE_PREVIEW,
    });

    render(
      <ImportProductsButton
        importAction={importAction}
        readFile={async () => "csv-text"}
      />,
    );
    const file = new File(["..."], "products.csv", { type: "text/csv" });
    await user.upload(
      screen.getByTestId("import-csv-file-input") as HTMLInputElement,
      file,
    );

    await waitFor(() =>
      expect(screen.getByTestId("import-csv-preview-dialog")).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("import-csv-cancel"));

    await waitFor(() =>
      expect(
        screen.queryByTestId("import-csv-preview-dialog"),
      ).not.toBeInTheDocument(),
    );

    // Only the dry-run was sent — no commit follow-up.
    const modes = importAction.mock.calls.map((c) => c[0].mode);
    expect(modes).toEqual(["dry-run"]);
  });

  it("AC-4: operator can confirm — second call is mode=commit", async () => {
    const user = userEvent.setup();
    const importAction = vi
      .fn()
      .mockResolvedValueOnce({ success: true, data: SAMPLE_PREVIEW })
      .mockResolvedValueOnce({
        success: true,
        data: {
          ...SAMPLE_PREVIEW,
          mode: "commit",
          summary: { ...SAMPLE_PREVIEW.summary, createdCount: 1 },
        },
      });
    const onCommitted = vi.fn();

    render(
      <ImportProductsButton
        importAction={importAction}
        readFile={async () => "csv-text"}
        onCommitted={onCommitted}
      />,
    );
    const file = new File(["..."], "products.csv", { type: "text/csv" });
    await user.upload(
      screen.getByTestId("import-csv-file-input") as HTMLInputElement,
      file,
    );

    await waitFor(() =>
      expect(screen.getByTestId("import-csv-preview-dialog")).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("import-csv-confirm"));

    await waitFor(() => expect(importAction).toHaveBeenCalledTimes(2));
    expect(importAction.mock.calls[1]![0].mode).toBe("commit");
    await waitFor(() => expect(onCommitted).toHaveBeenCalled());
  });

  it("AC-3: when the file has a header error, the dialog shows the file error and disables Confirmar", async () => {
    const user = userEvent.setup();
    const importAction = vi.fn().mockResolvedValue({
      success: true,
      data: {
        mode: "dry-run" as const,
        fileError: "El encabezado del CSV no coincide.",
        valid: [],
        invalid: [],
        summary: {
          totalRows: 0,
          validCount: 0,
          invalidCount: 0,
          createdCount: 0,
          updatedCount: 0,
          movementsLogged: 0,
        },
      },
    });

    render(
      <ImportProductsButton
        importAction={importAction}
        readFile={async () => "csv-text"}
      />,
    );
    const file = new File(["bad"], "bad.csv", { type: "text/csv" });
    await user.upload(
      screen.getByTestId("import-csv-file-input") as HTMLInputElement,
      file,
    );

    await waitFor(() =>
      expect(screen.getByTestId("import-csv-file-error")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("import-csv-confirm")).toBeDisabled();
  });
});
