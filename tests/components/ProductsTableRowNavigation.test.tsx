/**
 * T8 — AC-8: En /products, cada fila clickeable navega a /products/[sku]
 * EXCEPTO los botones de acción +/−/Editar que mantienen sus handlers.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ProductDTO } from "@application/dtos/ProductDTO";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
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

beforeEach(() => {
  pushMock.mockReset();
});

describe("ProductsTable — row navigation (T8 AC-8)", () => {
  it("clicking a row navigates to /products/<sku> (URL-encoded)", () => {
    render(
      <ProductsTable
        products={[makeProduct("p1", "MS-01", "Mouse")]}
        stockByProductId={{ p1: 10 }}
      />,
    );
    const row = screen.getByTestId("product-row");
    fireEvent.click(row);
    expect(pushMock).toHaveBeenCalledWith("/products/MS-01");
  });

  it("URL-encodes special characters in the SKU when navigating", () => {
    render(
      <ProductsTable
        products={[makeProduct("p1", "MS 01/A", "Mouse")]}
        stockByProductId={{ p1: 10 }}
      />,
    );
    fireEvent.click(screen.getByTestId("product-row"));
    expect(pushMock).toHaveBeenCalledWith(
      `/products/${encodeURIComponent("MS 01/A")}`,
    );
  });

  it("pressing Enter on a focused row also navigates (keyboard a11y)", () => {
    render(
      <ProductsTable
        products={[makeProduct("p1", "MS-01", "Mouse")]}
        stockByProductId={{ p1: 10 }}
      />,
    );
    const row = screen.getByTestId("product-row");
    fireEvent.keyDown(row, { key: "Enter" });
    expect(pushMock).toHaveBeenCalledWith("/products/MS-01");
  });

  it("clicking the ENTRADA (+) trigger does NOT navigate the row", () => {
    render(
      <ProductsTable
        products={[makeProduct("p1", "MS-01", "Mouse")]}
        stockByProductId={{ p1: 10 }}
      />,
    );
    const entrada = screen.getByTestId("entrada-trigger-p1");
    fireEvent.click(entrada);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("clicking the SALIDA (−) trigger does NOT navigate the row", () => {
    render(
      <ProductsTable
        products={[makeProduct("p1", "MS-01", "Mouse")]}
        stockByProductId={{ p1: 10 }}
      />,
    );
    const salida = screen.getByTestId("salida-trigger-p1");
    fireEvent.click(salida);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("clicking the Editar trigger does NOT navigate the row", () => {
    render(
      <ProductsTable
        products={[makeProduct("p1", "MS-01", "Mouse")]}
        stockByProductId={{ p1: 10 }}
        categories={[]}
      />,
    );
    const edit = screen.getByTestId("edit-product-trigger-p1");
    fireEvent.click(edit);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("the row exposes data-product-sku for the navigation target", () => {
    render(
      <ProductsTable
        products={[makeProduct("p1", "MS-01", "Mouse")]}
        stockByProductId={{ p1: 10 }}
      />,
    );
    expect(screen.getByTestId("product-row")).toHaveAttribute(
      "data-product-sku",
      "MS-01",
    );
  });

  it("the action cell hosts +/−/Editar — clicks inside it must NOT bubble to the row", () => {
    render(
      <ProductsTable
        products={[makeProduct("p1", "MS-01", "Mouse")]}
        stockByProductId={{ p1: 10 }}
      />,
    );
    const actionsCell = screen.getByTestId("row-actions-cell");
    const entrada = within(actionsCell).getByTestId("entrada-trigger-p1");
    fireEvent.click(entrada);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
