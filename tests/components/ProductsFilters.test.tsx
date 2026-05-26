/**
 * Tests for ProductsFilters — covers T6 ACs:
 *  - AC-1: search input top-left, placeholder "Buscar por SKU o nombre…",
 *          case-insensitive against sku and name, client-side.
 *  - AC-2 + AC-3: Nivel de stock select with Todos / En stock /
 *          Bajo stock (<10) / Sin stock (=0).
 *  - AC-4: filters combine AND.
 *  - AC-5: counter "Mostrando N de M productos".
 *  - AC-6: empty state + "Limpiar filtros" resets the three filters.
 *  - AC-7: individual "✕ Limpiar" button per active filter.
 */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductsFilters } from "@/components/products/ProductsFilters";
import type { ProductDTO } from "@application/dtos/ProductDTO";

function makeProduct(
  id: string,
  sku: string,
  name: string,
  categoryId: string | null = null,
  categoryName: string | null = null,
): ProductDTO {
  return {
    id,
    name,
    description: null,
    sku,
    price: 100,
    currency: "USD",
    categoryId,
    categoryName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const products: ProductDTO[] = [
  makeProduct("p1", "MOU-001", "Mouse Logitech", "c1", "Periféricos"),
  makeProduct("p2", "KEY-002", "Teclado Mecánico", "c1", "Periféricos"),
  makeProduct("p3", "MON-003", "Monitor 27\"", "c2", "Pantallas"),
  makeProduct("p4", "CAB-004", "Cable HDMI", "c3", "Cables"),
  makeProduct("p5", "USB-005", "USB Hub", "c3", "Cables"),
];

const categories = [
  { id: "c1", name: "Periféricos" },
  { id: "c2", name: "Pantallas" },
  { id: "c3", name: "Cables" },
];

// Stock: p1=15 (in), p2=5 (low), p3=0 (out), p4=20 (in), p5=3 (low)
const stockByProductId: Record<string, number> = {
  p1: 15,
  p2: 5,
  p3: 0,
  p4: 20,
  p5: 3,
};

function setup() {
  render(
    <ProductsFilters
      products={products}
      categories={categories}
      stockByProductId={stockByProductId}
    />,
  );
}

function visibleSkus(): string[] {
  const rows = screen.queryAllByTestId("product-row");
  return rows.map((row) =>
    within(row).getByText(/^[A-Z]+-\d+$/).textContent?.trim() ?? "",
  );
}

describe("ProductsFilters", () => {
  it("AC-1: search input is top-left with placeholder 'Buscar por SKU o nombre…' and filters case-insensitively by sku or name", async () => {
    const user = userEvent.setup();
    setup();

    const filtersContainer = screen.getByTestId("products-filters");
    const inputs = filtersContainer.querySelectorAll("input[type='search']");
    // First descendant input should be the search box (top-left).
    expect(inputs[0]).toBe(screen.getByTestId("search-input"));

    const searchInput = screen.getByTestId("search-input") as HTMLInputElement;
    expect(searchInput.placeholder).toBe("Buscar por SKU o nombre…");

    // Match by name (case-insensitive)
    await user.type(searchInput, "MOUSE");
    expect(visibleSkus()).toEqual(["MOU-001"]);

    // Clear and match by SKU (case-insensitive lowercase)
    await user.clear(searchInput);
    await user.type(searchInput, "key-002");
    expect(visibleSkus()).toEqual(["KEY-002"]);

    // Partial match against name
    await user.clear(searchInput);
    await user.type(searchInput, "cab");
    expect(visibleSkus()).toEqual(["CAB-004"]);
  });

  it("AC-2 + AC-3: Nivel de stock select has Todos / En stock / Bajo stock (<10) / Sin stock (=0) and filters the table", async () => {
    const user = userEvent.setup();
    setup();

    const stockFilter = screen.getByTestId("stock-level-filter") as HTMLSelectElement;
    const options = Array.from(stockFilter.options).map((o) => o.textContent?.trim());
    expect(options).toEqual([
      "Todos",
      "En stock",
      "Bajo stock (< 10)",
      "Sin stock (= 0)",
    ]);

    // En stock (qty >= 10): p1=15, p4=20
    await user.selectOptions(stockFilter, "in");
    expect(visibleSkus().sort()).toEqual(["CAB-004", "MOU-001"]);

    // Bajo stock (0 < qty < 10): p2=5, p5=3
    await user.selectOptions(stockFilter, "low");
    expect(visibleSkus().sort()).toEqual(["KEY-002", "USB-005"]);

    // Sin stock (qty = 0): p3
    await user.selectOptions(stockFilter, "out");
    expect(visibleSkus().sort()).toEqual(["MON-003"]);

    // Todos: all 5
    await user.selectOptions(stockFilter, "all");
    expect(visibleSkus()).toHaveLength(5);
  });

  it("AC-4: search + category + stock-level filters combine with AND", async () => {
    const user = userEvent.setup();
    setup();

    // Category "Cables" → p4 (20), p5 (3)
    await user.selectOptions(screen.getByTestId("category-filter"), "c3");
    expect(visibleSkus().sort()).toEqual(["CAB-004", "USB-005"]);

    // + Stock = bajo → only p5 (qty=3)
    await user.selectOptions(screen.getByTestId("stock-level-filter"), "low");
    expect(visibleSkus()).toEqual(["USB-005"]);

    // + Search "USB" → still p5
    await user.type(screen.getByTestId("search-input"), "USB");
    expect(visibleSkus()).toEqual(["USB-005"]);

    // Tighten search to a non-matching term within the same Cables+low subset
    await user.clear(screen.getByTestId("search-input"));
    await user.type(screen.getByTestId("search-input"), "Mouse");
    expect(visibleSkus()).toEqual([]);
  });

  it("AC-5: shows a 'Mostrando N de M productos' counter that updates with filters", async () => {
    const user = userEvent.setup();
    setup();

    const counter = screen.getByTestId("results-counter");
    expect(counter).toHaveTextContent("Mostrando 5 de 5 productos");

    await user.selectOptions(screen.getByTestId("stock-level-filter"), "out");
    expect(counter).toHaveTextContent("Mostrando 1 de 5 productos");

    await user.selectOptions(screen.getByTestId("stock-level-filter"), "all");
    await user.type(screen.getByTestId("search-input"), "no-match-zzz");
    expect(counter).toHaveTextContent("Mostrando 0 de 5 productos");
  });

  it("AC-6: zero matches shows the empty state and 'Limpiar filtros' resets all three filters", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByTestId("search-input"), "no-match-zzz");
    await user.selectOptions(screen.getByTestId("category-filter"), "c1");
    await user.selectOptions(screen.getByTestId("stock-level-filter"), "out");

    const empty = screen.getByTestId("filters-empty-state");
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveTextContent(/Ningún producto coincide con los filtros/);
    expect(screen.queryAllByTestId("product-row")).toHaveLength(0);

    const clearAll = screen.getByTestId("clear-all-filters");
    expect(clearAll).toHaveTextContent("Limpiar filtros");

    await user.click(clearAll);

    // All three filters back to default values.
    expect(
      (screen.getByTestId("search-input") as HTMLInputElement).value,
    ).toBe("");
    expect(
      (screen.getByTestId("category-filter") as HTMLSelectElement).value,
    ).toBe("");
    expect(
      (screen.getByTestId("stock-level-filter") as HTMLSelectElement).value,
    ).toBe("all");

    // All rows back.
    expect(screen.queryAllByTestId("product-row")).toHaveLength(5);
    expect(screen.queryByTestId("filters-empty-state")).not.toBeInTheDocument();
  });

  it("AC-7: each active filter shows a '✕ Limpiar' button that clears only that filter", async () => {
    const user = userEvent.setup();
    setup();

    // At default state, no individual clear buttons should be visible.
    expect(screen.queryByTestId("clear-search")).not.toBeInTheDocument();
    expect(screen.queryByTestId("clear-category")).not.toBeInTheDocument();
    expect(screen.queryByTestId("clear-stock-level")).not.toBeInTheDocument();

    // Activate all three filters.
    await user.type(screen.getByTestId("search-input"), "Mouse");
    await user.selectOptions(screen.getByTestId("category-filter"), "c1");
    await user.selectOptions(screen.getByTestId("stock-level-filter"), "in");

    // Each clear button now exists, with label "Limpiar".
    const clearSearch = screen.getByTestId("clear-search");
    const clearCategory = screen.getByTestId("clear-category");
    const clearStock = screen.getByTestId("clear-stock-level");
    expect(clearSearch).toHaveTextContent(/Limpiar/);
    expect(clearCategory).toHaveTextContent(/Limpiar/);
    expect(clearStock).toHaveTextContent(/Limpiar/);

    // Click clearSearch — only search resets; category + stock stay.
    await user.click(clearSearch);
    expect((screen.getByTestId("search-input") as HTMLInputElement).value).toBe("");
    expect((screen.getByTestId("category-filter") as HTMLSelectElement).value).toBe("c1");
    expect((screen.getByTestId("stock-level-filter") as HTMLSelectElement).value).toBe("in");
    expect(screen.queryByTestId("clear-search")).not.toBeInTheDocument();

    // Click clearCategory — only category resets.
    await user.click(screen.getByTestId("clear-category"));
    expect((screen.getByTestId("category-filter") as HTMLSelectElement).value).toBe("");
    expect((screen.getByTestId("stock-level-filter") as HTMLSelectElement).value).toBe("in");
    expect(screen.queryByTestId("clear-category")).not.toBeInTheDocument();

    // Click clearStock — only stock resets.
    await user.click(screen.getByTestId("clear-stock-level"));
    expect((screen.getByTestId("stock-level-filter") as HTMLSelectElement).value).toBe("all");
    expect(screen.queryByTestId("clear-stock-level")).not.toBeInTheDocument();
  });
});
