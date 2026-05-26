/**
 * T15 — AC-1 + AC-6: ProductsTable renders a checkbox column when selection
 * props are wired, supports select-all / deselect-all (with indeterminate),
 * and stops propagation so row-link / per-row actions still work.
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

const products: ProductDTO[] = [
  makeProduct("p1", "A-01", "Producto A"),
  makeProduct("p2", "B-02", "Producto B"),
  makeProduct("p3", "C-03", "Producto C"),
];

beforeEach(() => {
  pushMock.mockReset();
});

describe("ProductsTable bulk-select (T15 AC-1 + AC-6)", () => {
  it("does NOT render the checkbox column when selection props are missing (back-compat)", () => {
    render(<ProductsTable products={products} />);
    expect(screen.queryByTestId("select-header-cell")).toBeNull();
    expect(screen.queryByTestId("select-all-checkbox")).toBeNull();
    for (const p of products) {
      expect(screen.queryByTestId(`select-row-${p.sku}`)).toBeNull();
    }
  });

  it("AC-1: renders header + per-row checkboxes when selection props are wired", () => {
    render(
      <ProductsTable
        products={products}
        selectedSkus={new Set()}
        onToggleOne={vi.fn()}
        onToggleAll={vi.fn()}
      />,
    );
    expect(screen.getByTestId("select-header-cell")).toBeInTheDocument();
    expect(screen.getByTestId("select-all-checkbox")).toBeInTheDocument();
    for (const p of products) {
      expect(screen.getByTestId(`select-row-${p.sku}`)).toBeInTheDocument();
    }
  });

  it("AC-1: toggling a per-row checkbox calls onToggleOne with the SKU", () => {
    const onToggleOne = vi.fn();
    render(
      <ProductsTable
        products={products}
        selectedSkus={new Set()}
        onToggleOne={onToggleOne}
        onToggleAll={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("select-row-B-02"));
    expect(onToggleOne).toHaveBeenCalledWith("B-02");
  });

  it("AC-1: select-all header passes the visible SKUs to onToggleAll", () => {
    const onToggleAll = vi.fn();
    render(
      <ProductsTable
        products={products}
        selectedSkus={new Set()}
        onToggleOne={vi.fn()}
        onToggleAll={onToggleAll}
      />,
    );
    fireEvent.click(screen.getByTestId("select-all-checkbox"));
    expect(onToggleAll).toHaveBeenCalledWith(["A-01", "B-02", "C-03"]);
  });

  it("AC-1: header is fully checked when every visible row is selected", () => {
    render(
      <ProductsTable
        products={products}
        selectedSkus={new Set(["A-01", "B-02", "C-03"])}
        onToggleOne={vi.fn()}
        onToggleAll={vi.fn()}
      />,
    );
    const cb = screen.getByTestId("select-all-checkbox") as HTMLInputElement;
    expect(cb.checked).toBe(true);
    expect(cb.indeterminate).toBe(false);
  });

  it("AC-1: header is indeterminate when some but not all visible rows are selected", () => {
    render(
      <ProductsTable
        products={products}
        selectedSkus={new Set(["A-01"])}
        onToggleOne={vi.fn()}
        onToggleAll={vi.fn()}
      />,
    );
    const cb = screen.getByTestId("select-all-checkbox") as HTMLInputElement;
    expect(cb.checked).toBe(false);
    expect(cb.indeterminate).toBe(true);
  });

  it("AC-6: clicking the row-select cell does NOT trigger row navigation", () => {
    render(
      <ProductsTable
        products={products}
        selectedSkus={new Set()}
        onToggleOne={vi.fn()}
        onToggleAll={vi.fn()}
      />,
    );
    const cb = screen.getByTestId("select-row-A-01");
    fireEvent.click(cb);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("selected rows carry data-selected='true'", () => {
    render(
      <ProductsTable
        products={products}
        selectedSkus={new Set(["B-02"])}
        onToggleOne={vi.fn()}
        onToggleAll={vi.fn()}
      />,
    );
    const rowB = screen
      .getAllByTestId("product-row")
      .find((r) => r.getAttribute("data-product-sku") === "B-02")!;
    const rowA = screen
      .getAllByTestId("product-row")
      .find((r) => r.getAttribute("data-product-sku") === "A-01")!;
    expect(rowB.getAttribute("data-selected")).toBe("true");
    expect(rowA.getAttribute("data-selected")).toBeNull();
  });
});
