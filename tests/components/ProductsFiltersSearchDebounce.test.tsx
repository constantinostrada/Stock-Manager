/**
 * T21 — AC: "El input usa debounce de 300ms antes de actualizar la URL"
 *          + "Hay un input 'Buscar producto…' arriba de la tabla"
 *          + "El query persiste en ?q=..."
 *
 * Drives ProductsFilters with vitest fake timers. Asserts:
 *  - the search input has the new placeholder "Buscar producto…"
 *  - typing does NOT push the URL synchronously
 *  - 300ms after the last keystroke, router.push fires with `?q=<value>`
 *  - rapid sequential typing collapses to a single push with the latest value
 *  - mounting with `initialSearch` from the URL does NOT re-push that URL
 *  - the URL push preserves an existing supplierId from the URL
 *
 * NOTE: we use `fireEvent.change` (synchronous) rather than `userEvent.type`
 * here. userEvent's internal per-keystroke timers conflict with vitest fake
 * timers and cause its `type` promise to never resolve, making the test hang.
 * The unit under test is the *debounce*, not the per-keystroke behavior of
 * the input, so a direct value swap is sufficient and far more reliable.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { ProductDTO } from "@application/dtos/ProductDTO";

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
  usePathname: () => "/products",
  useSearchParams: () => new URLSearchParams(),
}));

import { ProductsFilters } from "@/components/products/ProductsFilters";

function makeProduct(id: string, sku: string, name: string): ProductDTO {
  return {
    id,
    name,
    description: null,
    sku,
    price: 100,
    currency: "USD",
    categoryId: null,
    categoryName: null,
    supplierId: null,
    supplierName: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const products: ProductDTO[] = [
  makeProduct("p1", "MOU-001", "Mouse Logitech"),
  makeProduct("p2", "KEY-002", "Teclado"),
];

beforeEach(() => {
  pushMock.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ProductsFilters — T21 debounced search", () => {
  it("AC-1: renders the search input with placeholder 'Buscar producto…'", () => {
    render(<ProductsFilters products={products} categories={[]} />);
    const input = screen.getByTestId("search-input") as HTMLInputElement;
    expect(input.placeholder).toBe("Buscar producto…");
  });

  it("AC-2: does NOT push the URL synchronously while typing — only after 300ms of idle", () => {
    render(<ProductsFilters products={products} categories={[]} />);

    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "mouse" } });

    // Immediately after typing, no push has happened yet.
    expect(pushMock).not.toHaveBeenCalled();

    // Advance to just before the threshold — still nothing.
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(pushMock).not.toHaveBeenCalled();

    // Cross the 300ms boundary — push fires exactly once with the final value.
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/products?q=mouse");
  });

  it("AC-2: rapid typing collapses to a single push with the latest value", () => {
    render(<ProductsFilters products={products} categories={[]} />);

    const input = screen.getByTestId("search-input");

    // Each fireEvent.change must reset the debounce timer; only the final
    // value should land in router.push.
    fireEvent.change(input, { target: { value: "m" } });
    act(() => vi.advanceTimersByTime(200));
    expect(pushMock).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "mo" } });
    act(() => vi.advanceTimersByTime(200));
    expect(pushMock).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "mou" } });
    act(() => vi.advanceTimersByTime(200));
    expect(pushMock).not.toHaveBeenCalled();

    // Now stop typing and let the timer expire.
    act(() => vi.advanceTimersByTime(300));
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/products?q=mou");
  });

  it("AC-3: clicking 'clear-search' resets the input and a push without ?q= fires after the debounce", () => {
    render(
      <ProductsFilters
        products={products}
        categories={[]}
        initialSearch="mouse"
      />,
    );

    const input = screen.getByTestId("search-input") as HTMLInputElement;
    expect(input.value).toBe("mouse");

    fireEvent.click(screen.getByTestId("clear-search"));
    expect(input.value).toBe("");

    act(() => vi.advanceTimersByTime(300));

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/products");
  });

  it("AC-3: mounting with `initialSearch` does NOT re-push the same URL (avoids navigation loops)", () => {
    render(
      <ProductsFilters
        products={products}
        categories={[]}
        initialSearch="mouse"
      />,
    );

    // Even after the debounce window, no push because we haven't typed.
    act(() => vi.advanceTimersByTime(500));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("AC-3: a debounced search push preserves an existing supplierId from the URL", () => {
    render(
      <ProductsFilters
        products={products}
        categories={[]}
        initialSupplierId="sup-acme"
      />,
    );

    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "hub" },
    });
    act(() => vi.advanceTimersByTime(300));

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith(
      "/products?q=hub&supplierId=sup-acme",
    );
  });
});
