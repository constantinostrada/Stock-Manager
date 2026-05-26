/**
 * AC-2 / AC-3 / AC-4 — Dashboard page (/).
 *
 *  - AC-2: 3 cards shadcn (Total productos, Valor inventario formato moneda
 *          "$ 12.345,67", Bajo stock — color alerta si > 0).
 *  - AC-3: lista de últimos 5 movimientos debajo.
 *  - AC-4: Server Component (sin 'use client' innecesario) — verified by
 *          inspecting the file source has no "use client" directive.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

const getDashboardMetricsMock = vi.fn();
const getTodaysSummaryMock = vi.fn();
const listStockMovementsExecute = vi.fn();
const listProductsExecute = vi.fn();

vi.mock("@interfaces/actions/dashboardActions", () => ({
  getDashboardMetrics: (...args: unknown[]) => getDashboardMetricsMock(...args),
  getTodaysSummary: (...args: unknown[]) => getTodaysSummaryMock(...args),
}));

vi.mock("@infrastructure/container", () => ({
  listStockMovementsUseCase: {
    execute: (...args: unknown[]) => listStockMovementsExecute(...args),
  },
  listProductsUseCase: {
    execute: (...args: unknown[]) => listProductsExecute(...args),
  },
}));

import DashboardPage from "@/app/page";

beforeEach(() => {
  getDashboardMetricsMock.mockReset();
  getTodaysSummaryMock.mockReset();
  listStockMovementsExecute.mockReset();
  listProductsExecute.mockReset();

  // Default empty summary so existing tests aren't forced to specify one;
  // T16 added the dependency on `getTodaysSummary` to the page.
  getTodaysSummaryMock.mockResolvedValue({
    entradasCount: 0,
    salidasCount: 0,
    ajustesCount: 0,
    totalValueMoved: 0,
  });
});

describe("DashboardPage (AC-2 / AC-3)", () => {
  it("AC-2: renders 3 metric cards with the AC-required labels", async () => {
    getDashboardMetricsMock.mockResolvedValueOnce({
      totalProductos: 7,
      valorTotalInventario: 0,
      productosConBajoStock: 0,
    });
    listStockMovementsExecute.mockResolvedValueOnce([]);
    listProductsExecute.mockResolvedValueOnce([]);

    const ui = await DashboardPage();
    render(ui);

    const cards = screen.getByTestId("dashboard-metrics-cards");
    // Exactly the three AC cards live inside the grid.
    expect(within(cards).getByTestId("metric-total-productos")).toBeInTheDocument();
    expect(within(cards).getByTestId("metric-valor-inventario")).toBeInTheDocument();
    expect(within(cards).getByTestId("metric-bajo-stock")).toBeInTheDocument();

    expect(screen.getByTestId("metric-total-productos")).toHaveTextContent(
      /Total productos/,
    );
    expect(screen.getByTestId("metric-total-productos")).toHaveTextContent("7");
    expect(screen.getByTestId("metric-valor-inventario")).toHaveTextContent(
      /Valor inventario/,
    );
    expect(screen.getByTestId("metric-bajo-stock")).toHaveTextContent(
      /Bajo stock/,
    );
  });

  it("AC-2: valor inventario uses '$ 12.345,67' style formatting (es-AR grouping/decimal)", async () => {
    getDashboardMetricsMock.mockResolvedValueOnce({
      totalProductos: 1,
      valorTotalInventario: 12345.67,
      productosConBajoStock: 0,
    });
    listStockMovementsExecute.mockResolvedValueOnce([]);
    listProductsExecute.mockResolvedValueOnce([]);

    const ui = await DashboardPage();
    render(ui);

    const text = screen.getByTestId("valor-inventario-value").textContent ?? "";
    // Currency symbol present.
    expect(text).toContain("$");
    // es-AR grouping: dot as thousands separator and comma as decimal.
    expect(text).toContain("12.345");
    expect(text).toContain(",67");
  });

  it("AC-2: bajo stock card has alert styling when productosConBajoStock > 0", async () => {
    getDashboardMetricsMock.mockResolvedValueOnce({
      totalProductos: 5,
      valorTotalInventario: 0,
      productosConBajoStock: 3,
    });
    listStockMovementsExecute.mockResolvedValueOnce([]);
    listProductsExecute.mockResolvedValueOnce([]);

    const ui = await DashboardPage();
    render(ui);

    const card = screen.getByTestId("metric-bajo-stock");
    expect(card.getAttribute("data-alert")).toBe("true");
    const value = screen.getByTestId("bajo-stock-value");
    expect(value.className).toMatch(/text-destructive/);
    expect(value.textContent).toBe("3");
  });

  it("AC-2: bajo stock card has NO alert styling when productosConBajoStock === 0", async () => {
    getDashboardMetricsMock.mockResolvedValueOnce({
      totalProductos: 5,
      valorTotalInventario: 0,
      productosConBajoStock: 0,
    });
    listStockMovementsExecute.mockResolvedValueOnce([]);
    listProductsExecute.mockResolvedValueOnce([]);

    const ui = await DashboardPage();
    render(ui);

    const card = screen.getByTestId("metric-bajo-stock");
    expect(card.getAttribute("data-alert")).toBe("false");
    const value = screen.getByTestId("bajo-stock-value");
    expect(value.className).not.toMatch(/text-destructive/);
  });

  it("AC-3: renders at most 5 movements below the cards", async () => {
    getDashboardMetricsMock.mockResolvedValueOnce({
      totalProductos: 1,
      valorTotalInventario: 0,
      productosConBajoStock: 0,
    });
    // 7 movements: the page should slice to the first 5.
    const movements = Array.from({ length: 7 }, (_, i) => ({
      id: `m${i}`,
      productId: "p1",
      productName: "Mouse",
      type: "IN" as const,
      quantity: i + 1,
      reason: "Compra",
      reference: null,
      createdAt: new Date(2026, 4, 25 - i, 10, 0, 0).toISOString(),
    }));
    listStockMovementsExecute.mockResolvedValueOnce(movements);
    listProductsExecute.mockResolvedValueOnce([
      {
        id: "p1",
        name: "Mouse",
        description: null,
        sku: "MS-01",
        price: 100,
        currency: "USD",
        categoryId: null,
        categoryName: null,
        createdAt: "2026-05-25T00:00:00Z",
        updatedAt: "2026-05-25T00:00:00Z",
      },
    ]);

    const ui = await DashboardPage();
    render(ui);

    expect(screen.getByTestId("recent-movements-section")).toBeInTheDocument();
    const rows = screen.getAllByTestId("movement-row");
    expect(rows).toHaveLength(5);
  });

  it("AC-3: renders an empty-state message when there are no movements", async () => {
    getDashboardMetricsMock.mockResolvedValueOnce({
      totalProductos: 0,
      valorTotalInventario: 0,
      productosConBajoStock: 0,
    });
    listStockMovementsExecute.mockResolvedValueOnce([]);
    listProductsExecute.mockResolvedValueOnce([]);

    const ui = await DashboardPage();
    render(ui);

    expect(screen.getByTestId("recent-movements-section")).toBeInTheDocument();
    expect(screen.queryAllByTestId("movement-row")).toHaveLength(0);
  });
});

describe("DashboardPage Server Component (AC-4)", () => {
  it("does not declare 'use client' — Server Component only", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/app/page.tsx"),
      "utf8",
    );
    // The directive must not appear as the first non-comment statement.
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
