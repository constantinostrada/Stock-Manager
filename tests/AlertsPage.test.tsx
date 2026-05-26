/**
 * T12 — AlertsPage (/alerts).
 * Covers:
 *   - AC-1: Server Component (no "use client" directive).
 *   - AC-3: header "Alertas de bajo stock" + subtitle with count.
 *   - AC-11: empty state when no low-stock products.
 *   - AC-4 sanity: table is rendered when there are rows.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LowStockProduct } from "@interfaces/alerts/types";

const getLowStockProductsMock = vi.fn();

vi.mock("@interfaces/actions/alertsActions", () => ({
  getLowStockProducts: (...args: unknown[]) => getLowStockProductsMock(...args),
}));

import AlertsPage from "@/app/alerts/page";

beforeEach(() => {
  getLowStockProductsMock.mockReset();
});

function makeRow(
  productId: string,
  stockActual: number,
  sku = `SKU-${productId}`,
): LowStockProduct {
  return {
    productId,
    sku,
    name: `Product ${productId}`,
    categoryName: null,
    stockActual,
    precioUnitario: 100,
    currency: "ARS",
    stockValue: stockActual * 100,
    urgency:
      stockActual === 0
        ? "sin-stock"
        : stockActual <= 3
          ? "critico"
          : stockActual <= 7
            ? "bajo"
            : "atencion",
  };
}

describe("AlertsPage — Server Component (AC-1)", () => {
  it("page module does NOT declare 'use client'", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/app/alerts/page.tsx"),
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

describe("AlertsPage — header + subtitle (AC-3)", () => {
  it("renders the AC-mandated header 'Alertas de bajo stock'", async () => {
    getLowStockProductsMock.mockResolvedValueOnce([]);
    const ui = await AlertsPage();
    render(ui);
    expect(
      screen.getByRole("heading", { level: 1, name: /Alertas de bajo stock/i }),
    ).toBeInTheDocument();
  });

  it("subtitle includes the count for many products", async () => {
    getLowStockProductsMock.mockResolvedValueOnce([
      makeRow("p1", 0),
      makeRow("p2", 2),
      makeRow("p3", 5),
    ]);
    const ui = await AlertsPage();
    render(ui);
    const subtitle = screen.getByTestId("alerts-subtitle");
    expect(subtitle.textContent).toBe("3 productos requieren reposición");
  });

  it("subtitle uses singular 'producto requiere' when count is 1", async () => {
    getLowStockProductsMock.mockResolvedValueOnce([makeRow("p1", 0)]);
    const ui = await AlertsPage();
    render(ui);
    const subtitle = screen.getByTestId("alerts-subtitle");
    expect(subtitle.textContent).toBe("1 producto requiere reposición");
  });

  it("subtitle shows 0 when there are no low-stock products", async () => {
    getLowStockProductsMock.mockResolvedValueOnce([]);
    const ui = await AlertsPage();
    render(ui);
    expect(screen.getByTestId("alerts-subtitle").textContent).toBe(
      "0 productos requieren reposición",
    );
  });
});

describe("AlertsPage — empty state (AC-11)", () => {
  it("shows the exact empty-state copy when count === 0", async () => {
    getLowStockProductsMock.mockResolvedValueOnce([]);
    const ui = await AlertsPage();
    render(ui);
    expect(screen.getByTestId("alerts-empty-state")).toBeInTheDocument();
    expect(screen.getByTestId("alerts-empty-state").textContent).toContain(
      "✓ Todo en orden · Ningún producto en bajo stock",
    );
    // And the table is NOT rendered.
    expect(screen.queryByTestId("alerts-table")).not.toBeInTheDocument();
  });
});

describe("AlertsPage — table when rows exist (AC-4)", () => {
  it("renders AlertsTable with one alert-row per low-stock product", async () => {
    getLowStockProductsMock.mockResolvedValueOnce([
      makeRow("p1", 0),
      makeRow("p2", 5),
    ]);
    const ui = await AlertsPage();
    render(ui);
    expect(screen.getByTestId("alerts-table")).toBeInTheDocument();
    expect(screen.getAllByTestId("alert-row")).toHaveLength(2);
    // Empty state is NOT shown.
    expect(screen.queryByTestId("alerts-empty-state")).not.toBeInTheDocument();
  });
});
