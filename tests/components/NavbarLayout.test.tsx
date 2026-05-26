/**
 * T13 — Navbar layout: <NavbarSearch /> is rendered to the right of the
 * "Alertas" link in the navbar (AC-1 positioning).
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Navbar } from "@/components/layout/Navbar";

describe("Navbar — global search positioning (AC-1)", () => {
  it("renders <NavbarSearch /> as part of the navbar header", () => {
    render(<Navbar lowStockCount={0} />);
    const header = screen.getByTestId("app-header");
    const search = screen.getByTestId("navbar-search");
    expect(header.contains(search)).toBe(true);
  });

  it("places NavbarSearch to the right of the Alertas link in DOM order", () => {
    render(<Navbar lowStockCount={0} />);
    const alertas = screen.getByTestId("nav-link-alerts");
    const search = screen.getByTestId("navbar-search");

    const position = alertas.compareDocumentPosition(search);
    // DOCUMENT_POSITION_FOLLOWING === 4 → `search` comes AFTER `alertas`.
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("Alertas link is the last <a> before the NavbarSearch form", () => {
    render(<Navbar lowStockCount={0} />);
    const header = screen.getByTestId("app-header");
    const allInteractive = Array.from(
      header.querySelectorAll("a, form[data-testid='navbar-search']"),
    );
    const alertasIdx = allInteractive.findIndex(
      (el) => el.getAttribute("data-testid") === "nav-link-alerts",
    );
    const searchIdx = allInteractive.findIndex(
      (el) => el.getAttribute("data-testid") === "navbar-search",
    );
    expect(alertasIdx).toBeGreaterThanOrEqual(0);
    expect(searchIdx).toBeGreaterThan(alertasIdx);
  });
});
