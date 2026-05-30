/**
 * T27 — Sortable headers on /products (Nombre / Precio / Stock):
 *
 *  - Headers exist as buttons with data-testid="sort-header-<field>"
 *  - Click cycles: none → asc → desc → none
 *  - Clicking a different column resets the previous (jumps to asc)
 *  - URL persists as ?sort=<field>:<direction>; "none" removes the param
 *  - Active header shows chevron-up (asc) / chevron-down (desc); none → no chevron
 *  - The URL push preserves existing q / supplierId from the URL
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ProductDTO } from "@application/dtos/ProductDTO";

const pushMock = vi.fn();
const searchParamsRef = { current: new URLSearchParams() };

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
  useSearchParams: () => searchParamsRef.current,
}));

import { ProductsTable, cycleSort, buildSortUrl } from "@/components/products/ProductsTable";

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
    deletedAt: null,
  };
}

const products: ProductDTO[] = [
  makeProduct("p1", "MOU-001", "Mouse"),
  makeProduct("p2", "KEY-002", "Teclado"),
];

beforeEach(() => {
  pushMock.mockReset();
  searchParamsRef.current = new URLSearchParams();
});

describe("ProductsTable — T27 sortable headers (presence + chevrons)", () => {
  it("renders sortable header buttons for Nombre, Precio and Stock", () => {
    render(<ProductsTable products={products} stockByProductId={{ p1: 10, p2: 5 }} />);
    const nameHeader = screen.getByTestId("sort-header-name");
    const priceHeader = screen.getByTestId("sort-header-price");
    const stockHeader = screen.getByTestId("sort-header-stock");
    expect(nameHeader).toHaveTextContent("Nombre");
    expect(priceHeader).toHaveTextContent("Precio");
    expect(stockHeader).toHaveTextContent("Stock");
    // None active by default → no chevrons present.
    expect(screen.queryByTestId("sort-chevron-up-name")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sort-chevron-down-name")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sort-chevron-up-price")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sort-chevron-down-stock")).not.toBeInTheDocument();
  });

  it("when sorted asc, the active header shows chevron-up only", () => {
    render(
      <ProductsTable
        products={products}
        stockByProductId={{ p1: 10, p2: 5 }}
        initialSort={{ field: "name", direction: "asc" }}
      />,
    );
    expect(screen.getByTestId("sort-chevron-up-name")).toBeInTheDocument();
    expect(screen.queryByTestId("sort-chevron-down-name")).not.toBeInTheDocument();
    // Other columns don't show chevrons.
    expect(screen.queryByTestId("sort-chevron-up-price")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sort-chevron-down-price")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sort-chevron-up-stock")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sort-chevron-down-stock")).not.toBeInTheDocument();
  });

  it("when sorted desc, the active header shows chevron-down only", () => {
    render(
      <ProductsTable
        products={products}
        stockByProductId={{ p1: 10, p2: 5 }}
        initialSort={{ field: "price", direction: "desc" }}
      />,
    );
    expect(screen.getByTestId("sort-chevron-down-price")).toBeInTheDocument();
    expect(screen.queryByTestId("sort-chevron-up-price")).not.toBeInTheDocument();
  });
});

describe("ProductsTable — T27 sort cycle on click", () => {
  it("AC-2: from no sort, clicking 'Nombre' pushes ?sort=name:asc", () => {
    render(<ProductsTable products={products} stockByProductId={{ p1: 10, p2: 5 }} />);
    fireEvent.click(screen.getByTestId("sort-header-name"));
    expect(pushMock).toHaveBeenCalledWith("/products?sort=name%3Aasc");
  });

  it("AC-2: from asc, clicking the SAME header pushes ?sort=<field>:desc", () => {
    render(
      <ProductsTable
        products={products}
        stockByProductId={{ p1: 10, p2: 5 }}
        initialSort={{ field: "name", direction: "asc" }}
      />,
    );
    fireEvent.click(screen.getByTestId("sort-header-name"));
    expect(pushMock).toHaveBeenCalledWith("/products?sort=name%3Adesc");
  });

  it("AC-2: from desc, clicking the SAME header removes the sort param", () => {
    render(
      <ProductsTable
        products={products}
        stockByProductId={{ p1: 10, p2: 5 }}
        initialSort={{ field: "name", direction: "desc" }}
      />,
    );
    fireEvent.click(screen.getByTestId("sort-header-name"));
    expect(pushMock).toHaveBeenCalledWith("/products");
  });

  it("AC-4: clicking a DIFFERENT column from asc resets to that column's asc (single-column sort)", () => {
    render(
      <ProductsTable
        products={products}
        stockByProductId={{ p1: 10, p2: 5 }}
        initialSort={{ field: "name", direction: "asc" }}
      />,
    );
    fireEvent.click(screen.getByTestId("sort-header-price"));
    expect(pushMock).toHaveBeenCalledWith("/products?sort=price%3Aasc");
  });

  it("AC-4: clicking a DIFFERENT column from desc also resets to that column's asc", () => {
    render(
      <ProductsTable
        products={products}
        stockByProductId={{ p1: 10, p2: 5 }}
        initialSort={{ field: "name", direction: "desc" }}
      />,
    );
    fireEvent.click(screen.getByTestId("sort-header-stock"));
    expect(pushMock).toHaveBeenCalledWith("/products?sort=stock%3Aasc");
  });

  it("AC-3: clicking the Stock header pushes ?sort=stock:<dir>", () => {
    render(<ProductsTable products={products} stockByProductId={{ p1: 10, p2: 5 }} />);
    fireEvent.click(screen.getByTestId("sort-header-stock"));
    expect(pushMock).toHaveBeenCalledWith("/products?sort=stock%3Aasc");
  });

  it("AC-3: the URL push preserves existing q and supplierId from the URL", () => {
    searchParamsRef.current = new URLSearchParams("q=mouse&supplierId=sup-acme");
    render(<ProductsTable products={products} stockByProductId={{ p1: 10, p2: 5 }} />);
    fireEvent.click(screen.getByTestId("sort-header-price"));
    const pushed = pushMock.mock.calls[0]![0] as string;
    expect(pushed.startsWith("/products?")).toBe(true);
    const search = new URLSearchParams(pushed.replace("/products?", ""));
    expect(search.get("q")).toBe("mouse");
    expect(search.get("supplierId")).toBe("sup-acme");
    expect(search.get("sort")).toBe("price:asc");
  });

  it("AC-3: removing the sort (desc → none) keeps existing q / supplierId in the URL", () => {
    searchParamsRef.current = new URLSearchParams("q=mouse&supplierId=sup-acme&sort=name:desc");
    render(
      <ProductsTable
        products={products}
        stockByProductId={{ p1: 10, p2: 5 }}
        initialSort={{ field: "name", direction: "desc" }}
      />,
    );
    fireEvent.click(screen.getByTestId("sort-header-name"));
    const pushed = pushMock.mock.calls[0]![0] as string;
    const search = new URLSearchParams(pushed.replace("/products?", ""));
    expect(search.get("q")).toBe("mouse");
    expect(search.get("supplierId")).toBe("sup-acme");
    expect(search.get("sort")).toBeNull();
  });
});

describe("ProductsTable — T27 cycleSort pure function", () => {
  it("none → asc on the clicked column", () => {
    expect(cycleSort(null, "name")).toEqual({ field: "name", direction: "asc" });
  });

  it("asc on the same column → desc", () => {
    expect(cycleSort({ field: "name", direction: "asc" }, "name")).toEqual({
      field: "name",
      direction: "desc",
    });
  });

  it("desc on the same column → none (null)", () => {
    expect(cycleSort({ field: "name", direction: "desc" }, "name")).toBeNull();
  });

  it("any state on a different column → asc on the new column", () => {
    expect(cycleSort({ field: "name", direction: "asc" }, "price")).toEqual({
      field: "price",
      direction: "asc",
    });
    expect(cycleSort({ field: "stock", direction: "desc" }, "name")).toEqual({
      field: "name",
      direction: "asc",
    });
  });
});

describe("ProductsTable — T27 buildSortUrl preserves siblings", () => {
  it("with no other params, sort=name:asc renders as /products?sort=name%3Aasc", () => {
    const url = buildSortUrl(new URLSearchParams(), {
      field: "name",
      direction: "asc",
    });
    expect(url).toBe("/products?sort=name%3Aasc");
  });

  it("null sort drops the param entirely", () => {
    const url = buildSortUrl(new URLSearchParams("sort=name:asc"), null);
    expect(url).toBe("/products");
  });

  it("preserves q + supplierId alongside the new sort", () => {
    const url = buildSortUrl(
      new URLSearchParams("q=hub&supplierId=sup-acme"),
      { field: "price", direction: "desc" },
    );
    const search = new URLSearchParams(url.replace("/products?", ""));
    expect(search.get("q")).toBe("hub");
    expect(search.get("supplierId")).toBe("sup-acme");
    expect(search.get("sort")).toBe("price:desc");
  });
});
