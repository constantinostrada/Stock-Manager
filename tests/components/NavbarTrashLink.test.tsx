/**
 * T30 AC-5 — Link Papelera en navbar con badge count si hay items.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Navbar } from "@/components/layout/Navbar";

describe("Navbar — Papelera link (T30)", () => {
  it("renders a 'Papelera' link pointing at /products/trash", () => {
    render(<Navbar deletedCount={0} />);
    const link = screen.getByTestId("nav-link-trash");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/products/trash");
    expect(link.textContent).toContain("Papelera");
  });

  it("does NOT render the badge when deletedCount === 0", () => {
    render(<Navbar deletedCount={0} />);
    expect(screen.queryByTestId("nav-trash-badge")).not.toBeInTheDocument();
    expect(screen.getByTestId("nav-link-trash")).toHaveAttribute(
      "data-has-deleted",
      "false",
    );
  });

  it("renders the numeric badge with the count when deletedCount > 0", () => {
    render(<Navbar deletedCount={4} />);
    const badge = screen.getByTestId("nav-trash-badge");
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe("4");
    expect(screen.getByTestId("nav-link-trash")).toHaveAttribute(
      "data-has-deleted",
      "true",
    );
  });

  it("defaults deletedCount to 0 when not provided (no badge)", () => {
    render(<Navbar />);
    expect(screen.queryByTestId("nav-trash-badge")).not.toBeInTheDocument();
  });

  it("propagates the count into an aria-label with Spanish pluralisation", () => {
    render(<Navbar deletedCount={1} />);
    const link = screen.getByTestId("nav-link-trash");
    expect(link.getAttribute("aria-label")).toBe("Papelera (1 eliminado)");
  });

  it("uses plural eliminado for counts > 1", () => {
    render(<Navbar deletedCount={3} />);
    const link = screen.getByTestId("nav-link-trash");
    expect(link.getAttribute("aria-label")).toBe("Papelera (3 eliminados)");
  });

  it("badge uses a neutral muted color (red is reserved for the Alertas dot)", () => {
    render(<Navbar deletedCount={2} />);
    const badge = screen.getByTestId("nav-trash-badge");
    expect(badge.className).not.toMatch(/bg-red-/);
    expect(badge.className).toMatch(/bg-muted-foreground/);
  });
});
