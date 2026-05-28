/**
 * T19 — AC-2 + AC-4: ProductsFilters renders a Proveedor dropdown ("Todos" +
 * each supplier) and changes the URL via router.push so the filter is
 * server-side + bookmarkable. The select reads its initial value from the
 * `initialSupplierId` prop (the page resolved it from searchParams.supplierId).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function makeProduct(id: string, sku: string): ProductDTO {
  return {
    id,
    name: `Product ${id}`,
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

const products: ProductDTO[] = [makeProduct("p1", "MOU-001")];

const suppliers = [
  { id: "sup-acme", name: "Acme" },
  { id: "sup-logitech", name: "Logitech" },
];

beforeEach(() => {
  pushMock.mockReset();
});

describe("ProductsFilters — Proveedor dropdown (T19 AC-2 + AC-4)", () => {
  it("AC-2: renders the supplier-filter select with 'Todos los proveedores' + every supplier", () => {
    render(
      <ProductsFilters
        products={products}
        categories={[]}
        suppliers={suppliers}
      />,
    );
    const select = screen.getByTestId("supplier-filter") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    const optionLabels = Array.from(select.options).map((o) => o.textContent?.trim());
    expect(optionLabels[0]).toBe("Todos los proveedores");
    expect(optionLabels).toContain("Acme");
    expect(optionLabels).toContain("Logitech");
    expect(optionLabels).toHaveLength(3);
  });

  it("AC-4: selecting a supplier pushes /products?supplierId=<id>", async () => {
    const user = userEvent.setup();
    render(
      <ProductsFilters
        products={products}
        categories={[]}
        suppliers={suppliers}
      />,
    );
    const select = screen.getByTestId("supplier-filter");
    await user.selectOptions(select, "sup-acme");
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/products?supplierId=sup-acme");
  });

  it("AC-4: selecting 'Todos los proveedores' pushes /products (no supplierId param)", async () => {
    const user = userEvent.setup();
    render(
      <ProductsFilters
        products={products}
        categories={[]}
        suppliers={suppliers}
        initialSupplierId="sup-acme"
      />,
    );
    const select = screen.getByTestId("supplier-filter") as HTMLSelectElement;
    expect(select.value).toBe("sup-acme");
    await user.selectOptions(select, "");
    expect(pushMock).toHaveBeenCalledWith("/products");
  });

  it("AC-4: initialSupplierId seeds the select value from the URL", () => {
    render(
      <ProductsFilters
        products={products}
        categories={[]}
        suppliers={suppliers}
        initialSupplierId="sup-logitech"
      />,
    );
    const select = screen.getByTestId("supplier-filter") as HTMLSelectElement;
    expect(select.value).toBe("sup-logitech");
    expect(screen.getByTestId("clear-supplier")).toBeInTheDocument();
  });

  it("AC-4: changing supplier preserves the existing search query in the URL", async () => {
    const user = userEvent.setup();
    render(
      <ProductsFilters
        products={products}
        categories={[]}
        suppliers={suppliers}
        initialSearch="mouse"
      />,
    );
    const select = screen.getByTestId("supplier-filter");
    await user.selectOptions(select, "sup-acme");
    expect(pushMock).toHaveBeenCalledWith(
      "/products?q=mouse&supplierId=sup-acme",
    );
  });
});
