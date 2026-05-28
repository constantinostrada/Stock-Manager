/**
 * T23 — AC: header de layout principal incluye un link a /dashboard.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Navbar } from "@/components/layout/Navbar";

describe("Navbar — Inventario link (T23)", () => {
  it("renders an 'Inventario' link pointing at /dashboard", () => {
    render(<Navbar lowStockCount={0} />);
    const link = screen.getByTestId("nav-link-inventory");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard");
    expect(link.textContent).toContain("Inventario");
  });

  it("Inventario link lives inside the app header", () => {
    render(<Navbar lowStockCount={0} />);
    const header = screen.getByTestId("app-header");
    const link = screen.getByTestId("nav-link-inventory");
    expect(header.contains(link)).toBe(true);
  });
});
