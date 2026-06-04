/**
 * T25 — Product Detail Page (/products/[id]).
 *
 * Covers:
 *   - Server Component (no 'use client' in the route file)
 *   - Renders nombre, precio, stock actual, proveedor asociado
 *   - Renders MovementsHistoryTable for the page slice (DESC sort comes from use case)
 *   - Empty state when no movements
 *   - Calls notFound() when getProductWithMovements returns NOT_FOUND
 *   - Pagination controls present when total > limit
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const getProductWithMovementsMock = vi.fn();
const getProductPriceHistoryMock = vi.fn(async () => ({
  success: true,
  data: { entries: [] },
}));

vi.mock("@interfaces/actions/productActions", () => ({
  getProductWithMovements: (...args: unknown[]) =>
    getProductWithMovementsMock(...args),
  getProductPriceHistory: (...args: unknown[]) =>
    getProductPriceHistoryMock(...args),
}));

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/products/p1",
  useSearchParams: () => new URLSearchParams(),
}));

import ProductDetailPage from "@/app/products/[id]/page";

function product(
  overrides: Partial<{
    id: string;
    sku: string;
    name: string;
    price: number;
    currency: string;
    categoryName: string | null;
    supplierId: string | null;
    supplierName: string | null;
    createdAt: string;
    updatedAt: string;
  }> = {},
) {
  return {
    id: overrides.id ?? "p1",
    name: overrides.name ?? "Mouse inalámbrico",
    description: null,
    sku: overrides.sku ?? "MS-01",
    price: overrides.price ?? 250,
    currency: overrides.currency ?? "USD",
    categoryId: "cat-1",
    categoryName: overrides.categoryName ?? "Periféricos",
    supplierId: overrides.supplierId === undefined ? "sup-1" : overrides.supplierId,
    supplierName:
      overrides.supplierName === undefined ? "ACME" : overrides.supplierName,
    createdAt: overrides.createdAt ?? "2026-01-15T10:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-05-20T14:30:00.000Z",
  };
}

function stockLevel(quantity: number) {
  return {
    id: "sl1",
    productId: "p1",
    productName: "Mouse inalámbrico",
    productSku: "MS-01",
    quantity,
    minQuantity: 0,
    isLowStock: quantity <= 0,
    isOutOfStock: quantity === 0,
    updatedAt: new Date().toISOString(),
  };
}

function movement(
  id: string,
  type: "IN" | "OUT" | "ADJUSTMENT",
  qty: number,
  when: string,
  reason: string | null = null,
) {
  return {
    id,
    productId: "p1",
    productName: "Mouse inalámbrico",
    type,
    quantity: qty,
    reason,
    reference: null,
    createdAt: when,
  };
}

beforeEach(() => {
  getProductWithMovementsMock.mockReset();
  notFoundMock.mockReset();
  notFoundMock.mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
});

describe("ProductDetailPage by id (T25)", () => {
  it("renders nombre, precio, stock actual y proveedor asociado", async () => {
    getProductWithMovementsMock.mockResolvedValueOnce({
      success: true,
      data: {
        product: product({ price: 100 }),
        stockLevel: stockLevel(15),
        movements: [],
        total_movements: 0,
        page: 1,
        limit: 10,
      },
    });

    const ui = await ProductDetailPage({
      params: Promise.resolve({ id: "p1" }),
    });
    render(ui);

    expect(screen.getByTestId("product-name")).toHaveTextContent(
      "Mouse inalámbrico",
    );
    expect(screen.getByTestId("info-stock")).toHaveTextContent("15");
    expect(screen.getByTestId("info-price").textContent).toMatch(/USD\s+100,00/);
    expect(screen.getByTestId("info-supplier")).toHaveTextContent("ACME");
  });

  it("shows 'Sin proveedor asociado' when supplier is null", async () => {
    getProductWithMovementsMock.mockResolvedValueOnce({
      success: true,
      data: {
        product: product({ supplierId: null, supplierName: null }),
        stockLevel: stockLevel(5),
        movements: [],
        total_movements: 0,
        page: 1,
        limit: 10,
      },
    });

    const ui = await ProductDetailPage({
      params: Promise.resolve({ id: "p1" }),
    });
    render(ui);

    expect(screen.getByTestId("info-supplier-empty")).toHaveTextContent(
      "Sin proveedor asociado",
    );
  });

  it("renders the movements table when there are movements (sorted DESC by the use case)", async () => {
    const movements = [
      movement("m2", "OUT", 5, "2026-05-20T12:00:00.000Z", "Venta"),
      movement("m1", "IN", 10, "2026-05-10T09:00:00.000Z", "Compra"),
    ];
    getProductWithMovementsMock.mockResolvedValueOnce({
      success: true,
      data: {
        product: product(),
        stockLevel: stockLevel(5),
        movements,
        total_movements: 2,
        page: 1,
        limit: 10,
      },
    });

    const ui = await ProductDetailPage({
      params: Promise.resolve({ id: "p1" }),
    });
    render(ui);

    const rows = screen.getAllByTestId("movement-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.getAttribute("data-tipo")).toBe("SALIDA");
    expect(rows[1]!.getAttribute("data-tipo")).toBe("ENTRADA");
  });

  it("shows empty state 'Sin movimientos registrados aún' when no movements", async () => {
    getProductWithMovementsMock.mockResolvedValueOnce({
      success: true,
      data: {
        product: product(),
        stockLevel: stockLevel(15),
        movements: [],
        total_movements: 0,
        page: 1,
        limit: 10,
      },
    });

    const ui = await ProductDetailPage({
      params: Promise.resolve({ id: "p1" }),
    });
    render(ui);

    expect(screen.getByTestId("movements-empty-state")).toHaveTextContent(
      "Sin movimientos registrados aún",
    );
    expect(screen.queryAllByTestId("movement-row")).toHaveLength(0);
  });

  it("renders pagination controls when total_movements exceeds the page size", async () => {
    getProductWithMovementsMock.mockResolvedValueOnce({
      success: true,
      data: {
        product: product(),
        stockLevel: stockLevel(10),
        movements: [
          movement("m1", "IN", 1, "2026-05-10T09:00:00.000Z"),
        ],
        total_movements: 25,
        page: 1,
        limit: 10,
      },
    });

    const ui = await ProductDetailPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: Promise.resolve({ page: "1", limit: "10" }),
    });
    render(ui);

    expect(screen.getByTestId("movements-pagination")).toBeInTheDocument();
    expect(screen.getByTestId("movements-pagination-info").textContent).toMatch(
      /P[áa]gina 1 de 3.*25 movimientos/,
    );
    const next = screen.getByTestId("movements-pagination-next");
    expect(next.getAttribute("href")).toBe("/products/p1?page=2&limit=10");
  });

  it("calls notFound() when the action returns NOT_FOUND", async () => {
    getProductWithMovementsMock.mockResolvedValueOnce({
      success: false,
      error: 'Product with id "NOPE" was not found.',
      code: "NOT_FOUND",
    });

    await expect(
      ProductDetailPage({ params: Promise.resolve({ id: "NOPE" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });
});

describe("ProductDetailPage source file (T25)", () => {
  it("is a Server Component — does NOT declare 'use client'", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/app/products/[id]/page.tsx"),
      "utf8",
    );
    const firstStatement = source
      .split("\n")
      .map((l) => l.trim())
      .find(
        (l) =>
          l.length > 0 &&
          !l.startsWith("//") &&
          !l.startsWith("/*") &&
          !l.startsWith("*"),
      );
    expect(firstStatement ?? "").not.toMatch(/['"]use client['"]/);
  });
});
