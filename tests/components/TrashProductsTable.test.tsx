/**
 * T30 — TrashProductsTable renders soft-deleted products with the catalog
 * columns + an "Eliminado el" column. Empty state when there are no rows.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { TrashProductsTable } from "@/components/products/TrashProductsTable";
import type { ProductDTO } from "@application/dtos/ProductDTO";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

function makeProduct(overrides: Partial<ProductDTO>): ProductDTO {
  return {
    id: "p1",
    name: "Mouse",
    description: null,
    sku: "MS-01",
    price: 100,
    currency: "USD",
    categoryId: null,
    categoryName: null,
    supplierId: null,
    supplierName: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: "2026-05-30T10:00:00.000Z",
    ...overrides,
  };
}

import { vi } from "vitest";

describe("TrashProductsTable (T30)", () => {
  it("renders the empty state when the products array is empty", () => {
    render(<TrashProductsTable products={[]} />);
    expect(screen.getByTestId("trash-empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("trash-table")).not.toBeInTheDocument();
  });

  it("renders a row per product with name, SKU, price and the deletedAt column", () => {
    const products = [
      makeProduct({
        id: "p1",
        name: "Mouse",
        sku: "MS-01",
        deletedAt: "2026-05-30T10:00:00.000Z",
      }),
      makeProduct({
        id: "p2",
        name: "Teclado",
        sku: "KB-02",
        deletedAt: "2026-05-29T08:30:00.000Z",
      }),
    ];
    render(<TrashProductsTable products={products} />);

    expect(screen.getByTestId("trash-table")).toBeInTheDocument();
    const rows = screen.getAllByTestId("trash-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.getAttribute("data-product-id")).toBe("p1");
    expect(rows[1]?.getAttribute("data-product-id")).toBe("p2");
    expect(screen.getByText("Mouse")).toBeInTheDocument();
    expect(screen.getByText("Teclado")).toBeInTheDocument();
    expect(screen.getByText("MS-01")).toBeInTheDocument();
    // "Eliminado el" column header is present.
    expect(screen.getByText("Eliminado el")).toBeInTheDocument();
    // Each row shows the formatted deletedAt cell.
    expect(screen.getByTestId("trash-row-deleted-at-p1")).toBeInTheDocument();
    expect(screen.getByTestId("trash-row-deleted-at-p2")).toBeInTheDocument();
  });

  it("renders restore + hard-delete action triggers per row", () => {
    const products = [makeProduct({ id: "p1", name: "Mouse" })];
    render(<TrashProductsTable products={products} />);
    expect(screen.getByTestId("restore-product-trigger-p1")).toBeInTheDocument();
    expect(screen.getByTestId("hard-delete-product-trigger-p1")).toBeInTheDocument();
  });
});
