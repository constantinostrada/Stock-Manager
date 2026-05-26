/**
 * AC-2: En cada fila de /products botones "+" (entrada) y "−" (salida).
 * AC-4: Stock en tabla se actualiza tras registrar — verified here as
 *       "each row renders a Stock cell"; the refresh wiring is verified
 *       in RegisterMovementDialog.test.tsx.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductsTable } from "@/components/products/ProductsTable";
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

describe("ProductsTable +/- per row (AC-2 + AC-4)", () => {
  it("renders a '+' (entrada) and '−' (salida) trigger inside EVERY product row", () => {
    const products = [
      makeProduct("p1", "SKU-1", "Mouse"),
      makeProduct("p2", "SKU-2", "Teclado"),
      makeProduct("p3", "SKU-3", "Monitor"),
    ];
    render(
      <ProductsTable
        products={products}
        stockByProductId={{ p1: 10, p2: 5, p3: 0 }}
      />,
    );

    const rows = screen.getAllByTestId("product-row");
    expect(rows).toHaveLength(3);

    for (const product of products) {
      const entrada = screen.getByTestId(`entrada-trigger-${product.id}`);
      const salida = screen.getByTestId(`salida-trigger-${product.id}`);
      expect(entrada).toBeInTheDocument();
      expect(salida).toBeInTheDocument();
      expect(entrada.getAttribute("data-tipo")).toBe("ENTRADA");
      expect(salida.getAttribute("data-tipo")).toBe("SALIDA");
      expect(entrada).toHaveAttribute("aria-label", "Registrar entrada");
      expect(salida).toHaveAttribute("aria-label", "Registrar salida");
    }
  });

  it("AC-4: each row exposes a Stock cell whose value comes from stockByProductId", () => {
    const products = [
      makeProduct("p1", "SKU-1", "Mouse"),
      makeProduct("p2", "SKU-2", "Teclado"),
    ];
    render(
      <ProductsTable
        products={products}
        stockByProductId={{ p1: 42, p2: 0 }}
      />,
    );

    const stockCells = screen.getAllByTestId("stock-cell");
    expect(stockCells.map((c) => c.textContent?.trim())).toEqual(["42", "0"]);
  });

  it("renders 0 in the Stock cell when no stock entry is provided for a product", () => {
    const products = [makeProduct("p1", "SKU-1", "Mouse")];
    render(<ProductsTable products={products} stockByProductId={{}} />);
    expect(screen.getByTestId("stock-cell").textContent?.trim()).toBe("0");
  });
});
