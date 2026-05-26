/**
 * T12 — AC-12: Navbar carries an "Alertas" link with a red dot when
 * lowStockCount > 0.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Navbar } from "@/components/layout/Navbar";

describe("Navbar — Alertas link (AC-12)", () => {
  it("renders an 'Alertas' link pointing at /alerts", () => {
    render(<Navbar lowStockCount={0} />);
    const link = screen.getByTestId("nav-link-alerts");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/alerts");
    expect(link.textContent).toContain("Alertas");
  });

  it("does NOT render the red dot when lowStockCount === 0", () => {
    render(<Navbar lowStockCount={0} />);
    expect(screen.queryByTestId("nav-alerts-dot")).not.toBeInTheDocument();
    expect(screen.getByTestId("nav-link-alerts")).toHaveAttribute(
      "data-has-alerts",
      "false",
    );
  });

  it("renders the red dot when lowStockCount > 0", () => {
    render(<Navbar lowStockCount={3} />);
    const dot = screen.getByTestId("nav-alerts-dot");
    expect(dot).toBeInTheDocument();
    expect(dot.className).toMatch(/bg-red-600/);
    expect(screen.getByTestId("nav-link-alerts")).toHaveAttribute(
      "data-has-alerts",
      "true",
    );
  });

  it("defaults lowStockCount to 0 when not provided (no dot)", () => {
    render(<Navbar />);
    expect(screen.queryByTestId("nav-alerts-dot")).not.toBeInTheDocument();
  });

  it("propagates the count into an aria-label for screen readers", () => {
    render(<Navbar lowStockCount={4} />);
    const link = screen.getByTestId("nav-link-alerts");
    expect(link.getAttribute("aria-label")).toMatch(/4/);
  });
});
