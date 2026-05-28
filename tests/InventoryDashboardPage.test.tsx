/**
 * T23 — AC: /dashboard server-component renders the 3 metric cards
 * (Total productos / Valor total del stock / Bajo stock) and the
 * 5-lowest-stock list with name + current stock per row.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

const getInventoryDashboardExecute = vi.fn();

vi.mock("@infrastructure/container", () => ({
  getInventoryDashboardUseCase: {
    execute: (...args: unknown[]) => getInventoryDashboardExecute(...args),
  },
}));

import InventoryDashboardPage from "@/app/dashboard/page";

beforeEach(() => {
  getInventoryDashboardExecute.mockReset();
});

describe("InventoryDashboardPage (/dashboard)", () => {
  it("renders the 3 AC-required metric cards", async () => {
    getInventoryDashboardExecute.mockResolvedValueOnce({
      totalProducts: 12,
      totalStockValue: 1234.5,
      lowStockCount: 2,
      lowestStockProducts: [],
    });

    const ui = await InventoryDashboardPage();
    render(ui);

    const metrics = screen.getByTestId("inventory-dashboard-metrics");
    expect(within(metrics).getByTestId("metric-total-products")).toBeInTheDocument();
    expect(within(metrics).getByTestId("metric-total-stock-value")).toBeInTheDocument();
    expect(within(metrics).getByTestId("metric-low-stock-count")).toBeInTheDocument();

    expect(screen.getByTestId("metric-total-products-value").textContent).toBe("12");
    expect(screen.getByTestId("metric-low-stock-count-value").textContent).toBe("2");
  });

  it("formats the total stock value as currency", async () => {
    getInventoryDashboardExecute.mockResolvedValueOnce({
      totalProducts: 1,
      totalStockValue: 12345.67,
      lowStockCount: 0,
      lowestStockProducts: [],
    });

    const ui = await InventoryDashboardPage();
    render(ui);

    const text =
      screen.getByTestId("metric-total-stock-value-value").textContent ?? "";
    expect(text).toContain("$");
    expect(text).toContain("12.345");
    expect(text).toContain(",67");
  });

  it("renders one row per product in lowestStockProducts with name + stock", async () => {
    getInventoryDashboardExecute.mockResolvedValueOnce({
      totalProducts: 5,
      totalStockValue: 0,
      lowStockCount: 3,
      lowestStockProducts: [
        { productId: "p1", name: "Mouse", currentStock: 0 },
        { productId: "p2", name: "Teclado", currentStock: 1 },
        { productId: "p3", name: "Monitor", currentStock: 2 },
        { productId: "p4", name: "Cable", currentStock: 4 },
        { productId: "p5", name: "Cargador", currentStock: 7 },
      ],
    });

    const ui = await InventoryDashboardPage();
    render(ui);

    const rows = screen.getAllByTestId("inventory-dashboard-lowest-stock-row");
    expect(rows).toHaveLength(5);

    const firstRow = rows[0]!;
    expect(within(firstRow).getByTestId("lowest-stock-row-name").textContent).toBe(
      "Mouse",
    );
    expect(within(firstRow).getByTestId("lowest-stock-row-stock").textContent).toBe(
      "0",
    );
  });

  it("renders an empty-state message when there are no products", async () => {
    getInventoryDashboardExecute.mockResolvedValueOnce({
      totalProducts: 0,
      totalStockValue: 0,
      lowStockCount: 0,
      lowestStockProducts: [],
    });

    const ui = await InventoryDashboardPage();
    render(ui);

    expect(
      screen.getByTestId("inventory-dashboard-lowest-stock-empty"),
    ).toBeInTheDocument();
    expect(
      screen.queryAllByTestId("inventory-dashboard-lowest-stock-row"),
    ).toHaveLength(0);
  });

  it("matches the snapshot of the rendered DOM tree", async () => {
    getInventoryDashboardExecute.mockResolvedValueOnce({
      totalProducts: 3,
      totalStockValue: 100,
      lowStockCount: 1,
      lowestStockProducts: [
        { productId: "p1", name: "Mouse", currentStock: 0 },
        { productId: "p2", name: "Teclado", currentStock: 6 },
      ],
    });

    const ui = await InventoryDashboardPage();
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='inventory-dashboard-page']"),
    ).toMatchSnapshot();
  });

  it("AC-1: is a Server Component (no 'use client' directive)", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/app/dashboard/page.tsx"),
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
