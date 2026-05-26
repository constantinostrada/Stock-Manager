/**
 * T8 — Product Detail Page (/products/[sku]).
 *
 * Covers:
 *   AC-1: route file is a Next App Router server component (no 'use client').
 *   AC-3: header shows nombre, SKU, categoría, optional 'Bajo stock' badge.
 *   AC-4: left card with stock, precio, valor total, fecha creación, última actualización.
 *   AC-5: right table renders movements DESC for THIS product only.
 *   AC-6: empty state 'Sin movimientos registrados aún' when no movements.
 *   AC-7: '← Volver al catálogo' link to /products.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const getProductBySkuMock = vi.fn();

vi.mock("@interfaces/actions/productActions", () => ({
  getProductBySku: (...args: unknown[]) => getProductBySkuMock(...args),
}));

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/products/MS-01",
  useSearchParams: () => new URLSearchParams(),
}));

import ProductDetailPage from "@/app/products/[sku]/page";

function product(overrides: Partial<{
  id: string;
  sku: string;
  name: string;
  price: number;
  currency: string;
  categoryName: string | null;
  createdAt: string;
  updatedAt: string;
}> = {}) {
  return {
    id: overrides.id ?? "p1",
    name: overrides.name ?? "Mouse inalámbrico",
    description: null,
    sku: overrides.sku ?? "MS-01",
    price: overrides.price ?? 250,
    currency: overrides.currency ?? "USD",
    categoryId: "cat-1",
    categoryName: overrides.categoryName ?? "Periféricos",
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

function movement(id: string, type: "IN" | "OUT" | "ADJUSTMENT", qty: number, when: string, reason: string | null = null) {
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
  getProductBySkuMock.mockReset();
  notFoundMock.mockReset();
  notFoundMock.mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
});

describe("ProductDetailPage (T8)", () => {
  it("AC-3: header shows name, SKU and category", async () => {
    getProductBySkuMock.mockResolvedValueOnce({
      success: true,
      data: {
        product: product(),
        stockLevel: stockLevel(25),
        movements: [],
      },
    });

    const ui = await ProductDetailPage({ params: Promise.resolve({ sku: "MS-01" }) });
    render(ui);

    const header = screen.getByTestId("product-detail-header");
    expect(header).toBeInTheDocument();
    expect(screen.getByTestId("product-name")).toHaveTextContent("Mouse inalámbrico");
    expect(screen.getByTestId("product-sku")).toHaveTextContent("MS-01");
    expect(screen.getByTestId("product-category")).toHaveTextContent("Periféricos");
    // Stock 25 >= 10 → NO low-stock badge.
    expect(screen.queryByTestId("low-stock-badge")).not.toBeInTheDocument();
  });

  it("AC-3: header shows 'Bajo stock' badge when stockActual < 10", async () => {
    getProductBySkuMock.mockResolvedValueOnce({
      success: true,
      data: {
        product: product(),
        stockLevel: stockLevel(3),
        movements: [],
      },
    });

    const ui = await ProductDetailPage({ params: Promise.resolve({ sku: "MS-01" }) });
    render(ui);

    expect(screen.getByTestId("low-stock-badge")).toHaveTextContent("Bajo stock");
  });

  it("AC-4: left card shows stock, precio, valor total, fecha creación, última actualización", async () => {
    getProductBySkuMock.mockResolvedValueOnce({
      success: true,
      data: {
        product: product({ price: 100 }),
        stockLevel: stockLevel(15),
        movements: [],
      },
    });

    const ui = await ProductDetailPage({ params: Promise.resolve({ sku: "MS-01" }) });
    render(ui);

    const card = screen.getByTestId("product-info-card");
    expect(card).toBeInTheDocument();
    expect(screen.getByTestId("info-stock")).toHaveTextContent("15");
    expect(screen.getByTestId("info-price").textContent).toMatch(/USD\s+100,00/);
    // Valor total = 15 * 100 = 1500
    expect(screen.getByTestId("info-valor-total").textContent).toMatch(/1\.500,00/);
    expect(screen.getByTestId("info-created-at")).toBeInTheDocument();
    expect(screen.getByTestId("info-updated-at")).toBeInTheDocument();
  });

  it("AC-5: right table renders movements DESC for THIS product only", async () => {
    const movements = [
      movement("m2", "OUT", 5, "2026-05-20T12:00:00.000Z", "Venta"),
      movement("m1", "IN", 10, "2026-05-10T09:00:00.000Z", "Compra"),
    ];
    getProductBySkuMock.mockResolvedValueOnce({
      success: true,
      data: {
        product: product(),
        stockLevel: stockLevel(5),
        movements,
      },
    });

    const ui = await ProductDetailPage({ params: Promise.resolve({ sku: "MS-01" }) });
    render(ui);

    const card = screen.getByTestId("product-movements-card");
    expect(card).toBeInTheDocument();
    const rows = screen.getAllByTestId("movement-row");
    expect(rows).toHaveLength(2);
    // First row should be the latest (m2 — OUT 5).
    expect(rows[0]!.getAttribute("data-tipo")).toBe("SALIDA");
    expect(rows[1]!.getAttribute("data-tipo")).toBe("ENTRADA");
  });

  it("AC-6: empty state 'Sin movimientos registrados aún' when no movements", async () => {
    getProductBySkuMock.mockResolvedValueOnce({
      success: true,
      data: {
        product: product(),
        stockLevel: stockLevel(15),
        movements: [],
      },
    });

    const ui = await ProductDetailPage({ params: Promise.resolve({ sku: "MS-01" }) });
    render(ui);

    expect(screen.getByTestId("movements-empty-state")).toHaveTextContent(
      "Sin movimientos registrados aún",
    );
    expect(screen.queryAllByTestId("movement-row")).toHaveLength(0);
  });

  it("AC-7: '← Volver al catálogo' link points to /products", async () => {
    getProductBySkuMock.mockResolvedValueOnce({
      success: true,
      data: {
        product: product(),
        stockLevel: stockLevel(15),
        movements: [],
      },
    });

    const ui = await ProductDetailPage({ params: Promise.resolve({ sku: "MS-01" }) });
    render(ui);

    const back = screen.getByTestId("back-to-catalog");
    expect(back).toHaveAttribute("href", "/products");
    expect(back.textContent).toMatch(/Volver al cat[áa]logo/);
  });

  it("AC-2: calls Next.js notFound() when getProductBySku returns NOT_FOUND", async () => {
    getProductBySkuMock.mockResolvedValueOnce({
      success: false,
      error: "Product with sku \"NOPE\" was not found.",
      code: "NOT_FOUND",
    });

    await expect(
      ProductDetailPage({ params: Promise.resolve({ sku: "NOPE" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });
});

describe("ProductDetailPage source file (AC-1)", () => {
  it("is a Server Component — does NOT declare 'use client'", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/app/products/[sku]/page.tsx"),
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
