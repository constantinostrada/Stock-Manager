/**
 * T26 — Soft-deleted product detail view shows a "Producto eliminado el …"
 * banner and hides action buttons.
 *
 * The detail page is read-only today (no inline edit/delete on the page itself),
 * so "hide action buttons" reduces to: do not render a low-stock urgency badge
 * or any action affordance when the product is tombstoned, and surface the
 * banner unambiguously.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const getProductWithMovementsMock = vi.fn();

vi.mock("@interfaces/actions/productActions", () => ({
  getProductWithMovements: (...args: unknown[]) =>
    getProductWithMovementsMock(...args),
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

function product(overrides: { deletedAt?: string | null; stockQuantity?: number } = {}) {
  return {
    id: "p1",
    name: "Mouse inalámbrico",
    description: null,
    sku: "MS-01",
    price: 250,
    currency: "USD",
    categoryId: "cat-1",
    categoryName: "Periféricos",
    supplierId: "sup-1",
    supplierName: "ACME",
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-05-20T14:30:00.000Z",
    deletedAt: overrides.deletedAt ?? null,
  };
}

beforeEach(() => {
  getProductWithMovementsMock.mockReset();
  notFoundMock.mockReset();
  notFoundMock.mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
});

describe("ProductDetailPage soft-deleted state (T26)", () => {
  it("renders the 'Producto eliminado el <date>' banner when deletedAt is set", async () => {
    getProductWithMovementsMock.mockResolvedValueOnce({
      success: true,
      data: {
        product: product({ deletedAt: "2026-05-20T14:30:00.000Z" }),
        stockLevel: {
          id: "sl1",
          productId: "p1",
          productName: "Mouse inalámbrico",
          productSku: "MS-01",
          quantity: 0,
          minQuantity: 0,
          isLowStock: true,
          isOutOfStock: true,
          updatedAt: "2026-05-20T14:30:00.000Z",
        },
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

    const banner = screen.getByTestId("deleted-product-banner");
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toMatch(/Producto eliminado el/);
    // The banner surfaces the deletedAt date (formatted by es-AR; we just
    // verify a date-ish substring is rendered).
    expect(banner.textContent).toMatch(/20\/5\/(2026|26)/);
  });

  it("does NOT render the banner when the product is active (deletedAt = null)", async () => {
    getProductWithMovementsMock.mockResolvedValueOnce({
      success: true,
      data: {
        product: product({ deletedAt: null }),
        stockLevel: null,
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

    expect(screen.queryByTestId("deleted-product-banner")).toBeNull();
  });

  it("hides the low-stock badge (an action-context affordance) when the product is soft-deleted", async () => {
    getProductWithMovementsMock.mockResolvedValueOnce({
      success: true,
      data: {
        product: product({ deletedAt: "2026-05-20T14:30:00.000Z" }),
        stockLevel: {
          id: "sl1",
          productId: "p1",
          productName: "Mouse inalámbrico",
          productSku: "MS-01",
          quantity: 0,
          minQuantity: 0,
          isLowStock: true,
          isOutOfStock: true,
          updatedAt: "2026-05-20T14:30:00.000Z",
        },
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

    expect(screen.queryByTestId("low-stock-badge")).toBeNull();
  });
});
