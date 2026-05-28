/**
 * Tests for T9 — Export CSV de productos.
 *
 *  AC-1: Botón "📥 Exportar CSV" arriba a la derecha en /products, al lado del
 *        botón "+ Nuevo producto".
 *  AC-2: Click genera un CSV en el browser con los productos visibles en la
 *        tabla (respeta filtros de categoría / nivel de stock / búsqueda).
 *  AC-3: Columnas del CSV: SKU, Nombre, Categoría, Stock, Precio unitario,
 *        Valor total. Header en primera fila.
 *  AC-4: Nombre del archivo: stock-manager-productos-YYYY-MM-DD.csv.
 *  AC-5: Encoding UTF-8 con BOM.
 *  AC-6: Botón deshabilitado con tooltip "No hay productos para exportar"
 *        cuando no hay productos visibles.
 *  AC-7: Toast "Exportado · N productos" al click exitoso.
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportProductsButton } from "@/components/products/ExportProductsButton";
import { ProductsCatalog } from "@/components/products/ProductsCatalog";
import { ProductsFilters } from "@/components/products/ProductsFilters";
import {
  buildProductsCsv,
  csvFilenameFor,
  CSV_BOM,
  CSV_HEADER,
} from "@/lib/exportProductsCsv";
import { useToast } from "@/hooks/use-toast";
import type { ProductDTO } from "@application/dtos/ProductDTO";

vi.mock("@interfaces/actions/productActions", () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  getProductBySku: vi.fn(),
}));

function makeProduct(
  id: string,
  sku: string,
  name: string,
  categoryName: string | null,
  price: number,
  categoryId: string | null = null,
): ProductDTO {
  return {
    id,
    name,
    description: null,
    sku,
    price,
    currency: "USD",
    categoryId,
    categoryName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const products: ProductDTO[] = [
  makeProduct("p1", "MOU-001", "Mouse Logitech", "Periféricos", 25.5, "c1"),
  makeProduct("p2", "KEY-002", "Teclado Mecánico", "Periféricos", 99.99, "c1"),
  makeProduct("p3", "MON-003", "Monitor 27\"", "Pantallas", 300, "c2"),
  makeProduct("p4", "CAB-004", "Cable HDMI", "Cables", 5, "c3"),
  makeProduct("p5", "USB-005", "USB Hub", "Cables", 12.345, "c3"),
];

const categories = [
  { id: "c1", name: "Periféricos" },
  { id: "c2", name: "Pantallas" },
  { id: "c3", name: "Cables" },
];

// Stock: p1=15 (in), p2=5 (low), p3=0 (out), p4=20 (in), p5=3 (low)
const stockByProductId: Record<string, number> = {
  p1: 15,
  p2: 5,
  p3: 0,
  p4: 20,
  p5: 3,
};

// Test-only wrapper: replicates ProductsCatalog wiring but with an injectable
// download fn (the real ProductsCatalog calls the real `triggerCsvDownload`,
// which won't run cleanly in jsdom).
function ExportableCatalog({
  products,
  categories,
  stockByProductId,
  download,
  now,
}: {
  products: ProductDTO[];
  categories: Array<{ id: string; name: string }>;
  stockByProductId: Record<string, number>;
  download: (filename: string, content: string) => void;
  now?: () => Date;
}) {
  const [filtered, setFiltered] = useState<ProductDTO[]>(products);
  return (
    <div>
      <div data-testid="products-header">
        <ExportProductsButton
          products={filtered}
          stockByProductId={stockByProductId}
          download={download}
          now={now}
        />
      </div>
      <ProductsFilters
        products={products}
        categories={categories}
        stockByProductId={stockByProductId}
        onFilteredChange={setFiltered}
      />
    </div>
  );
}

// Probe component that exposes the toast hook's current state in the DOM.
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

describe("ExportProductsButton (T9)", () => {
  it("AC-1: button is rendered in the /products header next to the '+ Nuevo producto' button", () => {
    render(
      <ProductsCatalog
        products={products}
        categories={categories}
        stockByProductId={stockByProductId}
      />,
    );

    const header = screen.getByTestId("products-header");
    const exportBtn = within(header).getByTestId("export-csv-trigger");
    const newProductBtn = within(header).getByTestId("new-product-trigger");

    expect(exportBtn).toBeInTheDocument();
    expect(newProductBtn).toBeInTheDocument();
    // They share the same parent (the right-side action group of the header).
    expect(exportBtn.parentElement).toBe(newProductBtn.parentElement);
    // Visible label / accessible name reflect "Exportar CSV".
    expect(exportBtn).toHaveTextContent(/Exportar CSV/);
  });

  it("AC-2: clicking the export button uses the currently filtered list (respects T6 filters)", async () => {
    const user = userEvent.setup();
    const download = vi.fn();

    render(
      <ExportableCatalog
        products={products}
        categories={categories}
        stockByProductId={stockByProductId}
        download={download}
      />,
    );

    // Activate filter: Category = "Cables" (c3) → leaves p4 (Cable HDMI) and p5 (USB Hub).
    await user.selectOptions(screen.getByTestId("category-filter"), "c3");

    await user.click(screen.getByTestId("export-csv-trigger"));

    expect(download).toHaveBeenCalledTimes(1);
    const [, csv] = download.mock.calls[0]!;
    expect(csv).toContain("CAB-004");
    expect(csv).toContain("USB-005");
    expect(csv).not.toContain("MOU-001");
    expect(csv).not.toContain("KEY-002");
    expect(csv).not.toContain("MON-003");
  });

  it("AC-3: CSV header is the first row with the 6 mandated columns in order", () => {
    const csv = buildProductsCsv(products, stockByProductId);
    const lines = csv.slice(CSV_BOM.length).split("\r\n");
    expect(lines[0]).toBe("SKU,Nombre,Categoría,Stock,Precio unitario,Valor total");
    expect(CSV_HEADER).toEqual([
      "SKU",
      "Nombre",
      "Categoría",
      "Stock",
      "Precio unitario",
      "Valor total",
    ]);
    // First data row spot-check: MOU-001, Mouse Logitech, Periféricos, 15, 25.50, 382.50
    expect(lines[1]).toBe(`MOU-001,Mouse Logitech,Periféricos,15,25.50,382.50`);
    // Row containing a double-quote inside the name (Monitor 27") is properly
    // escaped per RFC 4180: the cell is wrapped in quotes and inner " is doubled.
    expect(lines[3]).toBe(`MON-003,"Monitor 27""",Pantallas,0,300.00,0.00`);
  });

  it("AC-4: filename uses today's date as stock-manager-productos-YYYY-MM-DD.csv", async () => {
    const user = userEvent.setup();
    const download = vi.fn();
    const now = () => new Date(2026, 4, 26, 8, 30); // May 26 2026 — month is 0-indexed
    render(
      <ExportProductsButton
        products={products}
        stockByProductId={stockByProductId}
        download={download}
        now={now}
      />,
    );

    await user.click(screen.getByTestId("export-csv-trigger"));
    expect(download).toHaveBeenCalledTimes(1);
    const [filename] = download.mock.calls[0]!;
    expect(filename).toBe("stock-manager-productos-2026-05-26.csv");

    // Pure-function helper sanity check too.
    expect(csvFilenameFor(new Date(2027, 0, 9))).toBe(
      "stock-manager-productos-2027-01-09.csv",
    );
  });

  it("AC-5: CSV content is UTF-8 prefixed with the BOM (U+FEFF) and preserves Spanish accents", () => {
    const csv = buildProductsCsv(products, stockByProductId);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(CSV_BOM.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Categoría");
    expect(csv).toContain("Teclado Mecánico");
    expect(csv).toContain("Periféricos");
  });

  it("AC-6: button is disabled with tooltip 'No hay productos para exportar' when filtered list is empty", async () => {
    const user = userEvent.setup();

    render(
      <ProductsCatalog
        products={products}
        categories={categories}
        stockByProductId={stockByProductId}
      />,
    );

    // Force filters to yield zero matches → button should disable + show tooltip.
    // (T21 moved the search filter server-side, so we force-empty via the
    // remaining client-side filters: Pantallas (c2) + stock "in" → p3 in c2
    // has qty=0, not "in" → 0 matches.)
    await user.selectOptions(screen.getByTestId("category-filter"), "c2");
    await user.selectOptions(screen.getByTestId("stock-level-filter"), "in");

    await waitFor(() => {
      const btn = screen.getByTestId("export-csv-trigger") as HTMLButtonElement;
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute("title", "No hay productos para exportar");
    });
  });

  it("AC-6 (alt): empty products array renders a disabled button with the tooltip", () => {
    render(<ExportProductsButton products={[]} stockByProductId={{}} />);
    const btn = screen.getByTestId("export-csv-trigger") as HTMLButtonElement;
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("title", "No hay productos para exportar");
  });

  it("AC-7: successful click shows toast 'Exportado · N productos'", async () => {
    const user = userEvent.setup();
    const download = vi.fn();

    render(
      <>
        <ExportProductsButton
          products={products}
          stockByProductId={stockByProductId}
          download={download}
        />
        <ToastProbe />
      </>,
    );

    await user.click(screen.getByTestId("export-csv-trigger"));

    await waitFor(() => {
      const probe = screen.getByTestId("toast-probe");
      expect(probe).toHaveTextContent(`Exportado · ${products.length} productos`);
    });
  });
});
