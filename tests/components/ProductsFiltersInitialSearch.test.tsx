/**
 * T13 (refreshed for T21) — `ProductsFilters` preloads the search input value
 * from `initialSearch` (the page derives this from `?q=`).
 *
 * Under T21, the search is server-side: the page narrows the `products` prop
 * via the use case before rendering, and the component only mirrors the URL
 * value back into the input. This test no longer asserts that the in-component
 * filter shortens the table — that's the page+use case's job (covered by
 * `tests/application/listProductsUseCase.test.ts`).
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
    supplierId: null,
    supplierName: null,
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

describe("ProductsFilters — initialSearch precarga (T13 + T21)", () => {
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
    // Clear button is visible because the input has a value.
    expect(screen.getByTestId("clear-search")).toBeInTheDocument();
  });

  it("preloads any string (case preserved) — value mirroring is verbatim", () => {
    render(
      <ProductsFilters
        products={products}
        categories={[]}
        stockByProductId={stockByProductId}
        initialSearch="KEY"
      />,
    );

    expect((screen.getByTestId("search-input") as HTMLInputElement).value).toBe(
      "KEY",
    );
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
    // No clear-search button when nothing is typed.
    expect(screen.queryByTestId("clear-search")).not.toBeInTheDocument();
    // The component renders rows for all products it received.
    expect(screen.queryAllByTestId("product-row")).toHaveLength(3);
  });
});
