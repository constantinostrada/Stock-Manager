/**
 * T12 — AlertsTable component.
 * Covers:
 *   - AC-4: column headers + order
 *   - AC-5..9: urgency badge mapping
 *   - AC-10: clickable row navigates to /products/[sku]
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { LowStockProduct, UrgencyLevel } from "@interfaces/alerts/types";

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
  usePathname: () => "/alerts",
  useSearchParams: () => new URLSearchParams(),
}));

import { AlertsTable } from "@/components/alerts/AlertsTable";

function makeRow(
  productId: string,
  overrides: Partial<LowStockProduct> = {},
): LowStockProduct {
  return {
    productId,
    sku: overrides.sku ?? `SKU-${productId}`,
    name: overrides.name ?? `Product ${productId}`,
    categoryName: overrides.categoryName ?? null,
    stockActual: overrides.stockActual ?? 5,
    precioUnitario: overrides.precioUnitario ?? 100,
    currency: overrides.currency ?? "ARS",
    stockValue:
      overrides.stockValue ??
      (overrides.stockActual ?? 5) * (overrides.precioUnitario ?? 100),
    urgency: overrides.urgency ?? "bajo",
  };
}

beforeEach(() => {
  pushMock.mockReset();
});

describe("AlertsTable — columns (AC-4)", () => {
  it("renders the 6 headers in order: SKU, Nombre, Categoría, Stock actual, Stock value, Urgencia", () => {
    render(<AlertsTable rows={[makeRow("p1")]} />);
    const headers = screen
      .getByTestId("alerts-table")
      .querySelectorAll("thead th");
    const labels = Array.from(headers).map((h) => h.textContent?.trim());
    expect(labels).toEqual([
      "SKU",
      "Nombre",
      "Categoría",
      "Stock actual",
      "Stock value",
      "Urgencia",
    ]);
  });

  it("each row exposes its productId via key data attrs", () => {
    render(
      <AlertsTable
        rows={[
          makeRow("p1", { sku: "MS-01" }),
          makeRow("p2", { sku: "KB-02" }),
        ]}
      />,
    );
    const rows = screen.getAllByTestId("alert-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("data-product-sku", "MS-01");
    expect(rows[1]).toHaveAttribute("data-product-sku", "KB-02");
  });

  it("Stock value cell formats as 'CURRENCY 1.234,56' (es-AR)", () => {
    render(
      <AlertsTable
        rows={[
          makeRow("p1", {
            stockActual: 3,
            precioUnitario: 411.5,
            stockValue: 1234.5,
            currency: "ARS",
          }),
        ]}
      />,
    );
    const row = screen.getByTestId("alert-row");
    expect(row.textContent ?? "").toContain("ARS 1.234,50");
  });
});

describe("AlertsTable — urgency badges (AC-5..9)", () => {
  const cases: Array<{ stock: number; urgency: UrgencyLevel; label: string }> =
    [
      { stock: 0, urgency: "sin-stock", label: "Sin stock" },
      { stock: 3, urgency: "critico", label: "Crítico" },
      { stock: 7, urgency: "bajo", label: "Bajo" },
      { stock: 9, urgency: "atencion", label: "Atención" },
    ];

  for (const c of cases) {
    it(`stock ${c.stock} → urgency "${c.urgency}" with label "${c.label}"`, () => {
      render(
        <AlertsTable
          rows={[makeRow("p1", { stockActual: c.stock, urgency: c.urgency })]}
        />,
      );
      const badge = screen.getByTestId("urgency-badge");
      expect(badge.getAttribute("data-urgency")).toBe(c.urgency);
      expect(badge.textContent).toBe(c.label);
    });
  }

  it("AC-6: sin-stock badge is the intense red variant (bg-red-700)", () => {
    render(
      <AlertsTable
        rows={[makeRow("p1", { stockActual: 0, urgency: "sin-stock" })]}
      />,
    );
    expect(screen.getByTestId("urgency-badge").className).toMatch(/bg-red-700/);
  });

  it("AC-7: critico badge uses the destructive variant", () => {
    render(
      <AlertsTable
        rows={[makeRow("p1", { stockActual: 2, urgency: "critico" })]}
      />,
    );
    expect(screen.getByTestId("urgency-badge").className).toMatch(/bg-destructive/);
  });

  it("AC-8: bajo badge is orange", () => {
    render(
      <AlertsTable
        rows={[makeRow("p1", { stockActual: 6, urgency: "bajo" })]}
      />,
    );
    expect(screen.getByTestId("urgency-badge").className).toMatch(/bg-orange-500/);
  });

  it("AC-9: atencion badge is yellow", () => {
    render(
      <AlertsTable
        rows={[makeRow("p1", { stockActual: 9, urgency: "atencion" })]}
      />,
    );
    expect(screen.getByTestId("urgency-badge").className).toMatch(/bg-yellow-400/);
  });
});

describe("AlertsTable — row navigation (AC-10)", () => {
  it("clicking a row navigates to /products/<id> (T25 — id-based route)", () => {
    render(<AlertsTable rows={[makeRow("p1", { sku: "MS-01" })]} />);
    fireEvent.click(screen.getByTestId("alert-row"));
    expect(pushMock).toHaveBeenCalledWith("/products/p1");
  });

  it("URL-encodes special characters in the id", () => {
    render(<AlertsTable rows={[makeRow("id with/slash", { sku: "MS 01/A" })]} />);
    fireEvent.click(screen.getByTestId("alert-row"));
    expect(pushMock).toHaveBeenCalledWith(
      `/products/${encodeURIComponent("id with/slash")}`,
    );
  });

  it("pressing Enter on a focused row navigates", () => {
    render(<AlertsTable rows={[makeRow("p1", { sku: "MS-01" })]} />);
    fireEvent.keyDown(screen.getByTestId("alert-row"), { key: "Enter" });
    expect(pushMock).toHaveBeenCalledWith("/products/p1");
  });

  it("pressing Space on a focused row navigates", () => {
    render(<AlertsTable rows={[makeRow("p1", { sku: "MS-01" })]} />);
    fireEvent.keyDown(screen.getByTestId("alert-row"), { key: " " });
    expect(pushMock).toHaveBeenCalledWith("/products/p1");
  });

  it("each row carries role='link' + tabIndex for keyboard a11y", () => {
    render(<AlertsTable rows={[makeRow("p1")]} />);
    const row = screen.getByTestId("alert-row");
    expect(row).toHaveAttribute("role", "link");
    expect(row).toHaveAttribute("tabindex", "0");
  });

  it("renders a placeholder dash when categoryName is null", () => {
    render(<AlertsTable rows={[makeRow("p1", { categoryName: null })]} />);
    const row = screen.getByTestId("alert-row");
    // 3rd cell (Categoría) contains the em-dash placeholder
    const cells = within(row).getAllByRole("cell");
    expect(cells[2].textContent).toContain("—");
  });
});
