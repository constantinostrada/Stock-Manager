/**
 * T28 — ExportProductsButton
 *
 *  AC: button sits in the /products header next to "Nuevo producto".
 *  AC: click invokes the `exportProducts` Server Action with `q` and `sort`
 *      from the URL.
 *  AC: page/limit URL params are NOT forwarded to the action.
 *  AC: on success, triggers a client-side download via blob + anchor.
 *  AC: shows toast "Exportado · N productos" / error toast on failure.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportProductsButton } from "@/components/products/ExportProductsButton";
import { ProductsCatalog } from "@/components/products/ProductsCatalog";
import { useToast } from "@/hooks/use-toast";

const searchParamsState: Record<string, string> = {};

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => searchParamsState[key] ?? null,
  }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@interfaces/actions/productActions", () => ({
  exportProducts: vi.fn(),
  previewProductsImport: vi.fn(),
  importProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  deleteProductsBulk: vi.fn(),
  getProductBySku: vi.fn(),
}));

function setSearchParams(params: Record<string, string>) {
  for (const key of Object.keys(searchParamsState)) delete searchParamsState[key];
  for (const [k, v] of Object.entries(params)) searchParamsState[k] = v;
}

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

describe("ExportProductsButton — T28", () => {
  it("AC-1: button is rendered in /products header next to the 'Nuevo producto' button", () => {
    setSearchParams({});
    // Stable references to prevent a render loop driven by inline defaults
    // colliding with ProductsFilters' useMemo deps.
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
    const exportBtn = within(header).getByTestId("export-csv-trigger");
    const newProductBtn = within(header).getByTestId("new-product-trigger");

    expect(exportBtn).toBeInTheDocument();
    expect(newProductBtn).toBeInTheDocument();
    expect(exportBtn.parentElement).toBe(newProductBtn.parentElement);
    expect(exportBtn).toHaveTextContent(/Exportar CSV/);
  });

  it("AC: click invokes the action with q and sort from the URL", async () => {
    setSearchParams({ q: "mouse", sort: "price:desc", page: "3", limit: "50" });
    const user = userEvent.setup();
    const exportAction = vi.fn().mockResolvedValue({
      success: true,
      data: { filename: "products-2026-05-26-0807.csv", content: "﻿h\r\nrow" },
    });
    const download = vi.fn();
    render(
      <ExportProductsButton exportAction={exportAction} download={download} />,
    );

    await user.click(screen.getByTestId("export-csv-trigger"));

    await waitFor(() => expect(exportAction).toHaveBeenCalledTimes(1));
    const payload = exportAction.mock.calls[0]![0];
    expect(payload).toEqual({ name: "mouse", sort: "price:desc" });
    // Page/limit must NOT propagate from the URL to the action input.
    expect(payload).not.toHaveProperty("page");
    expect(payload).not.toHaveProperty("limit");
  });

  it("AC: with no q / sort in the URL, the action is called with an empty payload", async () => {
    setSearchParams({});
    const user = userEvent.setup();
    const exportAction = vi.fn().mockResolvedValue({
      success: true,
      data: { filename: "products-2026-05-26-0807.csv", content: "﻿h\r\n" },
    });
    render(
      <ExportProductsButton exportAction={exportAction} download={vi.fn()} />,
    );

    await user.click(screen.getByTestId("export-csv-trigger"));

    await waitFor(() => expect(exportAction).toHaveBeenCalledTimes(1));
    expect(exportAction.mock.calls[0]![0]).toEqual({});
  });

  it("AC: on success, triggers download with the returned filename + content", async () => {
    setSearchParams({});
    const user = userEvent.setup();
    const exportAction = vi.fn().mockResolvedValue({
      success: true,
      data: {
        filename: "products-2026-05-26-0807.csv",
        content: "﻿h\r\nrow1\r\nrow2",
      },
    });
    const download = vi.fn();
    render(
      <ExportProductsButton exportAction={exportAction} download={download} />,
    );

    await user.click(screen.getByTestId("export-csv-trigger"));

    await waitFor(() => expect(download).toHaveBeenCalledTimes(1));
    expect(download).toHaveBeenCalledWith(
      "products-2026-05-26-0807.csv",
      "﻿h\r\nrow1\r\nrow2",
    );
  });

  it("AC: success toast announces row count (rows = CSV lines minus header)", async () => {
    setSearchParams({});
    const user = userEvent.setup();
    const exportAction = vi.fn().mockResolvedValue({
      success: true,
      data: {
        filename: "products-2026-05-26-0807.csv",
        // header + 3 rows
        content: "﻿h\r\nr1\r\nr2\r\nr3",
      },
    });
    render(
      <>
        <ExportProductsButton exportAction={exportAction} download={vi.fn()} />
        <ToastProbe />
      </>,
    );

    await user.click(screen.getByTestId("export-csv-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("toast-probe")).toHaveTextContent(
        "Exportado · 3 productos",
      );
    });
  });

  it("AC: on action failure, shows an error toast and does NOT trigger download", async () => {
    setSearchParams({});
    const user = userEvent.setup();
    const exportAction = vi.fn().mockResolvedValue({
      success: false,
      error: "boom",
      code: "INTERNAL_ERROR",
    });
    const download = vi.fn();
    render(
      <>
        <ExportProductsButton exportAction={exportAction} download={download} />
        <ToastProbe />
      </>,
    );

    await user.click(screen.getByTestId("export-csv-trigger"));

    await waitFor(() =>
      expect(screen.getByTestId("toast-probe")).toHaveTextContent(
        /No se pudo exportar el CSV/,
      ),
    );
    expect(download).not.toHaveBeenCalled();
  });
});
