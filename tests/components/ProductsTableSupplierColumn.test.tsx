/**
 * T19 — AC-1: ProductsTable renders a "Proveedor" column between Categoría
 * and Stock, showing the supplier name or "—" when the product has no
 * supplier.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ProductDTO } from "@application/dtos/ProductDTO";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/products",
  useSearchParams: () => new URLSearchParams(),
}));

import { ProductsTable } from "@/components/products/ProductsTable";

function makeProduct(
  id: string,
  sku: string,
  name: string,
  supplierName: string | null,
): ProductDTO {
  return {
    id,
    name,
    description: null,
    sku,
    price: 100,
    currency: "USD",
    categoryId: null,
    categoryName: "Categoría X",
    supplierId: supplierName ? `sup-${id}` : null,
    supplierName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("ProductsTable — Proveedor column (T19 AC-1)", () => {
  it("renders a 'Proveedor' header column", () => {
    render(
      <ProductsTable
        products={[makeProduct("p1", "MS-01", "Mouse", "Acme")]}
        stockByProductId={{ p1: 10 }}
      />,
    );
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent?.trim());
    expect(headers).toContain("Proveedor");
  });

  it("renders the Proveedor column AFTER Category and BEFORE Stock", () => {
    render(
      <ProductsTable
        products={[makeProduct("p1", "MS-01", "Mouse", "Acme")]}
        stockByProductId={{ p1: 10 }}
      />,
    );
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent?.trim());
    const categoryIdx = headers.indexOf("Category");
    const supplierIdx = headers.indexOf("Proveedor");
    const stockIdx = headers.indexOf("Stock");
    expect(categoryIdx).toBeGreaterThan(-1);
    expect(supplierIdx).toBeGreaterThan(-1);
    expect(stockIdx).toBeGreaterThan(-1);
    expect(supplierIdx).toBeGreaterThan(categoryIdx);
    expect(supplierIdx).toBeLessThan(stockIdx);
  });

  it("renders the supplier name when the product has a supplier", () => {
    render(
      <ProductsTable
        products={[makeProduct("p1", "MS-01", "Mouse", "Acme Supplies")]}
        stockByProductId={{ p1: 10 }}
      />,
    );
    const row = screen.getByTestId("product-row");
    const cell = within(row).getByTestId("supplier-cell");
    expect(cell).toHaveTextContent("Acme Supplies");
  });

  it("renders '—' when the product has no supplier", () => {
    render(
      <ProductsTable
        products={[makeProduct("p1", "MS-01", "Mouse", null)]}
        stockByProductId={{ p1: 10 }}
      />,
    );
    const row = screen.getByTestId("product-row");
    const cell = within(row).getByTestId("supplier-cell");
    expect(cell).toHaveTextContent("—");
  });

  it("renders one supplier cell per row across multiple rows", () => {
    render(
      <ProductsTable
        products={[
          makeProduct("p1", "MS-01", "Mouse", "Acme"),
          makeProduct("p2", "KB-02", "Keyboard", null),
          makeProduct("p3", "MN-03", "Monitor", "Logitech"),
        ]}
        stockByProductId={{ p1: 10, p2: 5, p3: 7 }}
      />,
    );
    const cells = screen.getAllByTestId("supplier-cell");
    expect(cells).toHaveLength(3);
    expect(cells[0]).toHaveTextContent("Acme");
    expect(cells[1]).toHaveTextContent("—");
    expect(cells[2]).toHaveTextContent("Logitech");
  });
});
