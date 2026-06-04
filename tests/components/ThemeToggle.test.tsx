/**
 * ThemeToggle component — dark mode toggle in the navbar.
 * Covers:
 *   - AC-1: sun/moon icon button toggles the `dark` class on <html> instantly.
 *   - AC-2: explicit choice is persisted in localStorage under "theme".
 *   - AC-3: reflects the theme already applied to <html> on mount (the inline
 *           head script applies system preference / stored choice before paint).
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeToggle } from "@/components/layout/ThemeToggle";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  document.documentElement.classList.remove("dark");
});

describe("ThemeToggle — AC-1 (toggles dark class on <html>)", () => {
  it("renders an icon button", () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId("theme-toggle");
    expect(button).toBeInTheDocument();
    expect(button.getAttribute("type")).toBe("button");
    // Lucide renders the sun/moon icon as an inline SVG inside the button.
    expect(button.querySelector("svg")).not.toBeNull();
  });

  it("adds the dark class to <html> when toggling from light", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    await user.click(screen.getByTestId("theme-toggle"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes the dark class from <html> when toggling from dark", async () => {
    document.documentElement.classList.add("dark");
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByTestId("theme-toggle"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggling twice returns to the original theme", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = screen.getByTestId("theme-toggle");
    await user.click(button);
    await user.click(button);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("ThemeToggle — AC-2 (persists explicit choice in localStorage)", () => {
  it("stores 'dark' after toggling to dark", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByTestId("theme-toggle"));
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("stores 'light' after toggling back to light", async () => {
    document.documentElement.classList.add("dark");
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByTestId("theme-toggle"));
    expect(localStorage.getItem("theme")).toBe("light");
  });
});

describe("ThemeToggle — AC-3 (reflects theme applied to <html> on mount)", () => {
  it("offers to switch to dark mode when the page is light", () => {
    render(<ThemeToggle />);
    expect(screen.getByTestId("theme-toggle").getAttribute("aria-label")).toBe(
      "Switch to dark mode",
    );
  });

  it("offers to switch to light mode when the page is dark", () => {
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);
    expect(screen.getByTestId("theme-toggle").getAttribute("aria-label")).toBe(
      "Switch to light mode",
    );
  });
});
