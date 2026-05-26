/**
 * T13 — NavbarSearch component.
 * Covers:
 *   - AC-1: placeholder "Buscar producto..." + search icon (lupa).
 *   - AC-2: submit (Enter inside input OR click on lupa) navigates to
 *           /products?q=<term> (URL-encoded).
 *   - AC-3: empty/whitespace-only value does NOT navigate on submit.
 *   - AC-5: client-side component with controlled input state.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import { NavbarSearch } from "@/components/layout/NavbarSearch";

beforeEach(() => {
  pushMock.mockReset();
});

describe("NavbarSearch — AC-1 (placeholder + lupa icon)", () => {
  it("renders an input with placeholder 'Buscar producto...'", () => {
    render(<NavbarSearch />);
    const input = screen.getByTestId("navbar-search-input") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toBe("Buscar producto...");
    expect(input.type).toBe("search");
  });

  it("renders a submit button with the lupa (Search) icon", () => {
    render(<NavbarSearch />);
    const submit = screen.getByTestId("navbar-search-submit");
    expect(submit).toBeInTheDocument();
    expect(submit.getAttribute("type")).toBe("submit");
    // Lucide renders the Search icon as an inline SVG inside the button.
    expect(submit.querySelector("svg")).not.toBeNull();
    // The button is labelled for screen readers.
    expect(submit.getAttribute("aria-label")).toBe("Buscar");
  });

  it("the form has role='search'", () => {
    render(<NavbarSearch />);
    expect(screen.getByTestId("navbar-search")).toHaveAttribute(
      "role",
      "search",
    );
  });
});

describe("NavbarSearch — AC-2 (submit navigates to /products?q=<term>)", () => {
  it("pressing Enter inside the input navigates to /products?q=<term>", async () => {
    const user = userEvent.setup();
    render(<NavbarSearch />);
    const input = screen.getByTestId("navbar-search-input");
    await user.type(input, "mouse{Enter}");
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/products?q=mouse");
  });

  it("clicking the lupa (submit) button navigates to /products?q=<term>", async () => {
    const user = userEvent.setup();
    render(<NavbarSearch />);
    await user.type(screen.getByTestId("navbar-search-input"), "teclado");
    await user.click(screen.getByTestId("navbar-search-submit"));
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/products?q=teclado");
  });

  it("URL-encodes spaces and special characters in the term", () => {
    render(<NavbarSearch />);
    const input = screen.getByTestId("navbar-search-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "mouse logitech & co" } });
    fireEvent.submit(screen.getByTestId("navbar-search"));
    expect(pushMock).toHaveBeenCalledWith(
      `/products?q=${encodeURIComponent("mouse logitech & co")}`,
    );
  });

  it("trims surrounding whitespace before navigating", () => {
    render(<NavbarSearch />);
    const input = screen.getByTestId("navbar-search-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "   mouse   " } });
    fireEvent.submit(screen.getByTestId("navbar-search"));
    expect(pushMock).toHaveBeenCalledWith("/products?q=mouse");
  });
});

describe("NavbarSearch — AC-3 (empty submit does not navigate)", () => {
  it("does NOT navigate when the input is empty and Enter is pressed", () => {
    render(<NavbarSearch />);
    fireEvent.submit(screen.getByTestId("navbar-search"));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does NOT navigate when the input is empty and lupa is clicked", async () => {
    const user = userEvent.setup();
    render(<NavbarSearch />);
    await user.click(screen.getByTestId("navbar-search-submit"));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does NOT navigate when the value is whitespace only", () => {
    render(<NavbarSearch />);
    const input = screen.getByTestId("navbar-search-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(screen.getByTestId("navbar-search"));
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe("NavbarSearch — AC-5 (client-side controlled input)", () => {
  it("starts empty and reflects what the user types (controlled state)", async () => {
    const user = userEvent.setup();
    render(<NavbarSearch />);
    const input = screen.getByTestId("navbar-search-input") as HTMLInputElement;
    expect(input.value).toBe("");
    await user.type(input, "hola");
    expect(input.value).toBe("hola");
    await user.clear(input);
    expect(input.value).toBe("");
  });
});
