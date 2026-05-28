/**
 * T25 — En /products, cada fila clickeable navega a /products/<id>
 * EXCEPTO los botones de acción +/−/Editar/Delete que mantienen sus handlers.
 * (T8 originalmente apuntaba a [sku]; T25 movió a [id] para alinear con la AC.)
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
    supplierId: null,
    supplierName: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  pushMock.mockReset();
});

describe("ProductsTable — row navigation (T25)", () => {
  it("clicking a row navigates to /products/<id> (URL-encoded)", () => {
    render(
      <ProductsTable
        products={[makeProduct("p1", "MS-01", "Mouse")]}
        stockByProductId={{ p1: 10 }}
      />,
    );
    const row = screen.getByTestId("product-row");
    fireEvent.click(row);
    expect(pushMock).toHaveBeenCalledWith("/products/p1");
  });

  it("URL-encodes special characters in the id when navigating", () => {
    render(
      <ProductsTable
        products={[makeProduct("id with/slash", "MS-01", "Mouse")]}
        stockByProductId={{ "id with/slash": 10 }}
      />,
    );
    fireEvent.click(screen.getByTestId("product-row"));
    expect(pushMock).toHaveBeenCalledWith(
      `/products/${encodeURIComponent("id with/slash")}`,
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
    expect(pushMock).toHaveBeenCalledWith("/products/p1");
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

  it("the row exposes data-product-id and data-product-sku", () => {
    render(
      <ProductsTable
        products={[makeProduct("p1", "MS-01", "Mouse")]}
        stockByProductId={{ p1: 10 }}
      />,
    );
    const row = screen.getByTestId("product-row");
    expect(row).toHaveAttribute("data-product-id", "p1");
    expect(row).toHaveAttribute("data-product-sku", "MS-01");
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

describe("ProductsTable — 'Ver detalle' link (T25 AC)", () => {
  it("renders a 'Ver detalle' link per row that points to /products/<id>", () => {
    render(
      <ProductsTable
        products={[makeProduct("p1", "MS-01", "Mouse")]}
        stockByProductId={{ p1: 10 }}
      />,
    );
    const link = screen.getByTestId("view-detail-link-p1");
    expect(link).toHaveTextContent("Ver detalle");
    expect(link).toHaveAttribute("href", "/products/p1");
  });

  it("URL-encodes the id in the 'Ver detalle' href", () => {
    render(
      <ProductsTable
        products={[makeProduct("id with/slash", "MS-01", "Mouse")]}
        stockByProductId={{ "id with/slash": 10 }}
      />,
    );
    const link = screen.getByTestId("view-detail-link-id with/slash");
    expect(link).toHaveAttribute(
      "href",
      `/products/${encodeURIComponent("id with/slash")}`,
    );
  });
});
