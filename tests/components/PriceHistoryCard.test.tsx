/**
 * T4 — PriceHistoryCard component tests.
 *
 * Covers:
 *   - empty state when the product never changed price
 *   - renders one row per change, most recent first, with old → new values
 *   - % delta colored red on increase, green on decrease
 *   - renders the pure-SVG sparkline (polyline, no chart library)
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceHistoryCard } from "@/components/products/PriceHistoryCard";
import type { PriceChangeDTO } from "@application/dtos/PriceHistoryDTO";

function change(
  id: string,
  oldPrice: number,
  newPrice: number,
  changedAt: string,
): PriceChangeDTO {
  return {
    id,
    productId: "p1",
    oldPrice,
    newPrice,
    deltaPercent: oldPrice === 0 ? null : ((newPrice - oldPrice) / oldPrice) * 100,
    changedAt,
  };
}

describe("PriceHistoryCard (T4)", () => {
  it("shows the empty state when there are no price changes", () => {
    render(<PriceHistoryCard entries={[]} currency="USD" />);

    expect(screen.getByTestId("price-history-empty-state")).toHaveTextContent(
      "Sin cambios de precio registrados aún",
    );
    expect(screen.queryByTestId("price-sparkline")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("price-change-row")).toHaveLength(0);
  });

  it("renders one row per change, most recent first, with old → new prices", () => {
    const entries = [
      change("c1", 100, 150, "2026-02-01T10:00:00.000Z"),
      change("c2", 150, 120, "2026-03-01T10:00:00.000Z"),
    ];
    render(<PriceHistoryCard entries={entries} currency="USD" />);

    const rows = screen.getAllByTestId("price-change-row");
    expect(rows).toHaveLength(2);
    // Most recent change (c2) first
    expect(rows[0]!.textContent).toMatch(/150,00.*→.*120,00/);
    expect(rows[1]!.textContent).toMatch(/100,00.*→.*150,00/);
  });

  it("colors the % delta red on increase and green on decrease", () => {
    const entries = [
      change("up", 100, 150, "2026-02-01T10:00:00.000Z"),
      change("down", 150, 120, "2026-03-01T10:00:00.000Z"),
    ];
    render(<PriceHistoryCard entries={entries} currency="USD" />);

    const rows = screen.getAllByTestId("price-change-row");
    const decreaseRow = rows[0]!; // newest first → the decrease
    const increaseRow = rows[1]!;

    expect(decreaseRow.getAttribute("data-direction")).toBe("decrease");
    expect(increaseRow.getAttribute("data-direction")).toBe("increase");

    const decreaseDelta = decreaseRow.querySelector(
      '[data-testid="price-change-delta"]',
    )!;
    const increaseDelta = increaseRow.querySelector(
      '[data-testid="price-change-delta"]',
    )!;
    expect(decreaseDelta.className).toContain("text-emerald-600");
    expect(decreaseDelta.textContent).toMatch(/-20,0\s*%/);
    expect(increaseDelta.className).toContain("text-red-600");
    expect(increaseDelta.textContent).toMatch(/\+50,0\s*%/);
  });

  it("renders an inline SVG sparkline with one point per price over time", () => {
    const entries = [
      change("c1", 100, 150, "2026-02-01T10:00:00.000Z"),
      change("c2", 150, 120, "2026-03-01T10:00:00.000Z"),
    ];
    const { container } = render(
      <PriceHistoryCard entries={entries} currency="USD" />,
    );

    const svg = screen.getByTestId("price-sparkline");
    expect(svg.tagName.toLowerCase()).toBe("svg");
    const polyline = container.querySelector(
      '[data-testid="price-sparkline"] polyline',
    )!;
    expect(polyline).not.toBeNull();
    // Series = initial oldPrice + one newPrice per change → 3 points
    expect(polyline.getAttribute("points")!.trim().split(/\s+/)).toHaveLength(3);
  });
});
