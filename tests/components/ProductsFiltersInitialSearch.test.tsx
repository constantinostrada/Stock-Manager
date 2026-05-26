/**
 * T13 — AC-4: ProductsFilters precarga el filtro de búsqueda existente del
 * catálogo cuando recibe `initialSearch` (lo que la página /products pasa
 * desde el query param `q`).
 */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ProductsFilters } from "@/components/products/ProductsFilters";
import type { ProductDTO } from "@application/dtos/ProductDTO";

function makeProduct(id: string, sku: string, name: string): ProductDTO {
  return {
    id,
    name,
    description: null,
    sku,
    price: 100,
    currency: "USD",
    categoryId: null,
    categoryName: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const products: ProductDTO[] = [
  makeProduct("p1", "MOU-001", "Mouse Logitech"),
  makeProduct("p2", "KEY-002", "Teclado Mecánico"),
  makeProduct("p3", "MON-003", "Monitor 27\""),
];

const stockByProductId: Record<string, number> = { p1: 5, p2: 5, p3: 5 };

function visibleSkus(): string[] {
  const rows = screen.queryAllByTestId("product-row");
  return rows.map((row) =>
    within(row).getByText(/^[A-Z]+-\d+$/).textContent?.trim() ?? "",
  );
}

describe("ProductsFilters — AC-4 initialSearch precarga", () => {
  it("preloads the search input with `initialSearch` when provided", () => {
    render(
      <ProductsFilters
        products={products}
        categories={[]}
        stockByProductId={stockByProductId}
        initialSearch="mouse"
      />,
    );

    const input = screen.getByTestId("search-input") as HTMLInputElement;
    expect(input.value).toBe("mouse");
  });

  it("filters the table by the preloaded search term", () => {
    render(
      <ProductsFilters
        products={products}
        categories={[]}
        stockByProductId={stockByProductId}
        initialSearch="mouse"
      />,
    );

    expect(visibleSkus()).toEqual(["MOU-001"]);
    expect(screen.getByTestId("results-counter")).toHaveTextContent(
      "Mostrando 1 de 3 productos",
    );
  });

  it("works for a SKU prefix as well (case-insensitive)", () => {
    render(
      <ProductsFilters
        products={products}
        categories={[]}
        stockByProductId={stockByProductId}
        initialSearch="key"
      />,
    );

    expect((screen.getByTestId("search-input") as HTMLInputElement).value).toBe(
      "key",
    );
    expect(visibleSkus()).toEqual(["KEY-002"]);
  });

  it("falls back to empty when initialSearch is undefined (no precarga)", () => {
    render(
      <ProductsFilters
        products={products}
        categories={[]}
        stockByProductId={stockByProductId}
      />,
    );

    expect((screen.getByTestId("search-input") as HTMLInputElement).value).toBe(
      "",
    );
    expect(screen.queryAllByTestId("product-row")).toHaveLength(3);
  });
});
