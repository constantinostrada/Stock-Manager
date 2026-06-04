/**
 * CSV import — ImportProductsDialog
 *
 *  AC: trigger sits in the /products header.
 *  AC: selecting a CSV file shows a preview table with per-row validation,
 *      highlighting invalid rows before anything is written.
 *  AC: confirm calls the import action with the parsed rows and shows a
 *      success toast; the confirm button is disabled with 0 valid rows.
 *  AC: unparseable files surface an error and never reach the actions.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportProductsDialog } from "@/components/products/ImportProductsDialog";
import { ProductsCatalog } from "@/components/products/ProductsCatalog";
import { useToast } from "@/hooks/use-toast";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@interfaces/actions/productActions", () => ({
  previewProductsImport: vi.fn(),
  importProducts: vi.fn(),
  exportProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  deleteProductsBulk: vi.fn(),
  getProductBySku: vi.fn(),
}));

function ToastProbe() {
  const { toasts } = useToast();
  return (
    <ul data-testid="toast-probe">
      {toasts.map((t) => (
        <li key={t.id} data-testid="toast-probe-item">
          {String(t.title ?? "")}
        </li>
      ))}
    </ul>
  );
}

const CSV = [
  "Nombre,SKU,Precio,Stock,Stock mínimo",
  "Mouse,MOU-001,25.50,12,3",
  ",TEC-001,80,,",
].join("\n");

const PARSED_ROWS = [
  {
    rowNumber: 2,
    name: "Mouse",
    sku: "MOU-001",
    price: "25.50",
    categoryName: "",
    supplierName: "",
    stock: "12",
    minStock: "3",
  },
  {
    rowNumber: 3,
    name: "",
    sku: "TEC-001",
    price: "80",
    categoryName: "",
    supplierName: "",
    stock: "",
    minStock: "",
  },
];

const PREVIEW_RESULT = {
  rows: [
    { ...PARSED_ROWS[0]!, valid: true, errors: [] },
    {
      ...PARSED_ROWS[1]!,
      valid: false,
      errors: ["El nombre es requerido."],
    },
  ],
  validCount: 1,
  errorCount: 1,
  createdCount: 0,
};

function makeFile(content = CSV) {
  return new File([content], "products.csv", { type: "text/csv" });
}

async function openAndUpload(opts: {
  previewAction?: ReturnType<typeof vi.fn>;
  importAction?: ReturnType<typeof vi.fn>;
  onImported?: () => void;
  file?: File;
}) {
  const previewAction =
    opts.previewAction ??
    vi.fn().mockResolvedValue({ success: true, data: PREVIEW_RESULT });
  const importAction = opts.importAction ?? vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <ImportProductsDialog
        previewAction={previewAction}
        importAction={importAction}
        {...(opts.onImported ? { onImported: opts.onImported } : {})}
      />
      <ToastProbe />
    </>,
  );
  await user.click(screen.getByTestId("import-csv-trigger"));
  const input = await screen.findByTestId("import-csv-file");
  await user.upload(input as HTMLInputElement, opts.file ?? makeFile());
  return { user, previewAction, importAction };
}

describe("ImportProductsDialog", () => {
  it("renders the trigger in the /products header", () => {
    const stableStock: Record<string, number> = {};
    const stableSuppliers: Array<{ id: string; name: string }> = [];
    render(
      <ProductsCatalog
        products={[]}
        categories={[{ id: "c1", name: "C1" }]}
        suppliers={stableSuppliers}
        stockByProductId={stableStock}
      />,
    );
    const header = screen.getByTestId("products-header");
    expect(within(header).getByTestId("import-csv-trigger")).toBeInTheDocument();
  });

  it("shows a preview with per-row validation after selecting a file (writes nothing)", async () => {
    const { previewAction, importAction } = await openAndUpload({});

    await waitFor(() =>
      expect(screen.getByTestId("import-summary")).toHaveTextContent(
        "1 filas válidas · 1 con errores",
      ),
    );
    expect(previewAction).toHaveBeenCalledWith({ rows: PARSED_ROWS });
    expect(importAction).not.toHaveBeenCalled();

    const rows = screen.getAllByTestId("import-preview-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("data-valid", "true");
    expect(rows[1]).toHaveAttribute("data-valid", "false");
    expect(rows[1]!.className).toMatch(/bg-destructive/);
    expect(
      within(rows[1]!).getByTestId("import-row-errors"),
    ).toHaveTextContent("El nombre es requerido.");
  });

  it("confirm calls the import action with the parsed rows and toasts the result", async () => {
    const onImported = vi.fn();
    const importAction = vi.fn().mockResolvedValue({
      success: true,
      data: { ...PREVIEW_RESULT, createdCount: 1 },
    });
    const { user } = await openAndUpload({ importAction, onImported });

    const confirm = await screen.findByTestId("import-confirm");
    await waitFor(() => expect(confirm).toBeEnabled());
    expect(confirm).toHaveTextContent("Importar 1 productos");
    await user.click(confirm);

    await waitFor(() =>
      expect(importAction).toHaveBeenCalledWith({ rows: PARSED_ROWS }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("toast-probe")).toHaveTextContent(
        "Importados 1 productos",
      ),
    );
    expect(onImported).toHaveBeenCalled();
  });

  it("disables confirm when no row is valid", async () => {
    const previewAction = vi.fn().mockResolvedValue({
      success: true,
      data: {
        rows: [
          { ...PARSED_ROWS[1]!, valid: false, errors: ["El nombre es requerido."] },
        ],
        validCount: 0,
        errorCount: 1,
        createdCount: 0,
      },
    });
    await openAndUpload({ previewAction });

    await waitFor(() =>
      expect(screen.getByTestId("import-summary")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("import-confirm")).toBeDisabled();
  });

  it("shows a file error (and no preview) for files missing required columns", async () => {
    const previewAction = vi.fn();
    await openAndUpload({
      previewAction,
      file: new File(["Nombre,Precio\nMouse,10"], "bad.csv", {
        type: "text/csv",
      }),
    });

    await waitFor(() =>
      expect(screen.getByTestId("import-file-error")).toHaveTextContent(
        "El archivo debe incluir las columnas Nombre, SKU y Precio",
      ),
    );
    expect(previewAction).not.toHaveBeenCalled();
    expect(screen.queryByTestId("import-summary")).not.toBeInTheDocument();
  });

  it("toasts an error when the import action fails", async () => {
    const importAction = vi.fn().mockResolvedValue({
      success: false,
      error: "Boom",
      code: "INTERNAL_ERROR",
    });
    const { user } = await openAndUpload({ importAction });

    const confirm = await screen.findByTestId("import-confirm");
    await waitFor(() => expect(confirm).toBeEnabled());
    await user.click(confirm);

    await waitFor(() =>
      expect(screen.getByTestId("toast-probe")).toHaveTextContent(
        "No se pudo importar el CSV",
      ),
    );
    // Dialog stays open so the user can retry.
    expect(screen.getByTestId("import-confirm")).toBeInTheDocument();
  });
});
