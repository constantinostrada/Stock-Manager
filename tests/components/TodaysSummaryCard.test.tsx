/**
 * T16 — Dashboard "Resumen del día" card (AC-3, AC-4, AC-5).
 *
 * AC-3: Card titled "Resumen del día" + grid of 4 stats:
 *       Entradas, Salidas, Ajustes, Valor movido.
 * AC-4: When no movements today → empty state "Sin movimientos hoy".
 * AC-5: Monetary values formatted with the existing project currency helper
 *       ("$ 12.345,67" — es-AR / ARS via Intl.NumberFormat).
 */
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

  // Defaults — individual tests override what they need.
  getDashboardMetricsMock.mockResolvedValue({
    totalProductos: 0,
    valorTotalInventario: 0,
    productosConBajoStock: 0,
  });
  listStockMovementsExecute.mockResolvedValue([]);
  listProductsExecute.mockResolvedValue([]);
});

describe("Resumen del día — card layout (AC-3)", () => {
  it("renders the card with the literal title 'Resumen del día'", async () => {
    getTodaysSummaryMock.mockResolvedValueOnce({
      entradasCount: 3,
      salidasCount: 2,
      ajustesCount: 1,
      totalValueMoved: 12345.67,
    });

    const ui = await DashboardPage();
    render(ui);

    const card = screen.getByTestId("todays-summary-card");
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent("Resumen del día");
  });

  it("renders 4 stats — Entradas / Salidas / Ajustes / Valor movido — with their values", async () => {
    getTodaysSummaryMock.mockResolvedValueOnce({
      entradasCount: 7,
      salidasCount: 4,
      ajustesCount: 2,
      totalValueMoved: 12345.67,
    });

    const ui = await DashboardPage();
    render(ui);

    const grid = screen.getByTestId("todays-summary-grid");
    expect(within(grid).getByTestId("summary-entradas")).toHaveTextContent(
      /Entradas/,
    );
    expect(within(grid).getByTestId("summary-entradas-value")).toHaveTextContent(
      "7",
    );

    expect(within(grid).getByTestId("summary-salidas")).toHaveTextContent(
      /Salidas/,
    );
    expect(within(grid).getByTestId("summary-salidas-value")).toHaveTextContent(
      "4",
    );

    expect(within(grid).getByTestId("summary-ajustes")).toHaveTextContent(
      /Ajustes/,
    );
    expect(within(grid).getByTestId("summary-ajustes-value")).toHaveTextContent(
      "2",
    );

    expect(within(grid).getByTestId("summary-valor-movido")).toHaveTextContent(
      /Valor movido/,
    );
  });
});

describe("Resumen del día — empty state (AC-4)", () => {
  it("renders 'Sin movimientos hoy' when all counts are zero", async () => {
    getTodaysSummaryMock.mockResolvedValueOnce({
      entradasCount: 0,
      salidasCount: 0,
      ajustesCount: 0,
      totalValueMoved: 0,
    });

    const ui = await DashboardPage();
    render(ui);

    const card = screen.getByTestId("todays-summary-card");
    expect(
      within(card).getByTestId("todays-summary-empty-state"),
    ).toHaveTextContent("Sin movimientos hoy");
    // No stats grid in the empty state.
    expect(within(card).queryByTestId("todays-summary-grid")).toBeNull();
  });

  it("renders the stats grid (NOT the empty state) when at least one movement exists today", async () => {
    getTodaysSummaryMock.mockResolvedValueOnce({
      entradasCount: 0,
      salidasCount: 0,
      ajustesCount: 1,
      totalValueMoved: 50,
    });

    const ui = await DashboardPage();
    render(ui);

    const card = screen.getByTestId("todays-summary-card");
    expect(within(card).getByTestId("todays-summary-grid")).toBeInTheDocument();
    expect(within(card).queryByTestId("todays-summary-empty-state")).toBeNull();
  });
});

describe("Resumen del día — currency formatting (AC-5)", () => {
  it("formats Valor movido with the project helper (es-AR '$ 12.345,67' style)", async () => {
    getTodaysSummaryMock.mockResolvedValueOnce({
      entradasCount: 1,
      salidasCount: 0,
      ajustesCount: 0,
      totalValueMoved: 12345.67,
    });

    const ui = await DashboardPage();
    render(ui);

    const text =
      screen.getByTestId("summary-valor-movido-value").textContent ?? "";
    // Currency symbol present.
    expect(text).toContain("$");
    // es-AR grouping: dot as thousands separator and comma as decimal.
    expect(text).toContain("12.345");
    expect(text).toContain(",67");
  });
});
