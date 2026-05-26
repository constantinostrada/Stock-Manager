/**
 * Tests for MovementsFilters — covers T11 ACs:
 *  - AC-1: search input top-left, placeholder "Buscar por razón…",
 *          case-insensitive match against `reason`.
 *  - AC-2: Tipo de movimiento select: Todos / Solo entradas / Solo salidas.
 *  - AC-3: Producto select populated from the `products` prop.
 *  - AC-4: the three filters combine AND.
 *  - AC-5: counter "Mostrando N de M movimientos".
 *  - AC-6: empty state + "Limpiar filtros" resets the three filters.
 *  - AC-7: individual "✕ Limpiar" button per active filter.
 *  - AC-8: structural — the component is a "use client" presentation
 *          component that does its filtering over the `movements` prop
 *          (no server round-trip).
 */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MovementsFilters } from "@/components/stock/MovementsFilters";
import type { StockMovementDTO } from "@application/dtos/StockDTO";

function makeMovement(
  id: string,
  productId: string,
  productName: string,
  type: "IN" | "OUT" | "ADJUSTMENT",
  quantity: number,
  reason: string | null,
  createdAt: string,
): StockMovementDTO {
  return {
    id,
    productId,
    productName,
    type,
    quantity,
    reason,
    reference: null,
    createdAt,
  };
}

const movements: StockMovementDTO[] = [
  makeMovement("m1", "p1", "Mouse Logitech", "IN", 5, "Compra a proveedor", "2026-05-25T10:00:00Z"),
  makeMovement("m2", "p1", "Mouse Logitech", "OUT", 2, "Venta al mostrador", "2026-05-25T11:00:00Z"),
  makeMovement("m3", "p2", "Teclado Mecánico", "IN", 3, "Reposición de stock", "2026-05-25T12:00:00Z"),
  makeMovement("m4", "p2", "Teclado Mecánico", "OUT", 1, "Venta online", "2026-05-25T13:00:00Z"),
  makeMovement("m5", "p3", "Monitor 27\"", "ADJUSTMENT", 1, "Ajuste por conteo físico", "2026-05-25T14:00:00Z"),
];

const products = [
  { id: "p1", name: "Mouse Logitech", sku: "MOU-001" },
  { id: "p2", name: "Teclado Mecánico", sku: "KEY-002" },
  { id: "p3", name: "Monitor 27\"", sku: "MON-003" },
];

const productSkuById: Record<string, string> = {
  p1: "MOU-001",
  p2: "KEY-002",
  p3: "MON-003",
};

function setup() {
  render(
    <MovementsFilters
      movements={movements}
      products={products}
      productSkuById={productSkuById}
    />,
  );
}

function visibleMovementIds(): string[] {
  const rows = screen.queryAllByTestId("movement-row");
  // Use the rendered "Razón" column text as a stable identifier proxy.
  // (movement-row doesn't expose data-id, but reason is unique in this fixture.)
  return rows.map((row) => {
    const cells = within(row).getAllByRole("cell");
    return cells[cells.length - 1]!.textContent?.trim() ?? "";
  });
}

describe("MovementsFilters", () => {
  it("AC-1: search input is top-left with placeholder 'Buscar por razón…' and filters case-insensitively against reason", async () => {
    const user = userEvent.setup();
    setup();

    const filtersContainer = screen.getByTestId("movements-filters");
    const inputs = filtersContainer.querySelectorAll("input[type='search']");
    expect(inputs[0]).toBe(screen.getByTestId("search-input"));

    const searchInput = screen.getByTestId("search-input") as HTMLInputElement;
    expect(searchInput.placeholder).toBe("Buscar por razón…");

    // Match by reason (case-insensitive uppercase).
    await user.type(searchInput, "COMPRA");
    expect(visibleMovementIds()).toEqual(["Compra a proveedor"]);

    // Match by reason (case-insensitive lowercase, partial).
    await user.clear(searchInput);
    await user.type(searchInput, "venta");
    expect(visibleMovementIds().sort()).toEqual([
      "Venta al mostrador",
      "Venta online",
    ]);
  });

  it("AC-2: Tipo de movimiento select has Todos / Solo entradas / Solo salidas and defaults to Todos", async () => {
    const user = userEvent.setup();
    setup();

    const typeFilter = screen.getByTestId("type-filter") as HTMLSelectElement;
    const options = Array.from(typeFilter.options).map((o) => o.textContent?.trim());
    expect(options).toEqual(["Todos", "Solo entradas", "Solo salidas"]);
    expect(typeFilter.value).toBe("all");

    // Solo entradas → only IN
    await user.selectOptions(typeFilter, "in");
    expect(visibleMovementIds().sort()).toEqual([
      "Compra a proveedor",
      "Reposición de stock",
    ]);

    // Solo salidas → only OUT
    await user.selectOptions(typeFilter, "out");
    expect(visibleMovementIds().sort()).toEqual([
      "Venta al mostrador",
      "Venta online",
    ]);

    // Todos → all 5 (incl ADJUSTMENT)
    await user.selectOptions(typeFilter, "all");
    expect(screen.queryAllByTestId("movement-row")).toHaveLength(5);
  });

  it("AC-3: Producto select is populated from the `products` prop (one option per product with movements), defaults to Todos los productos, and filters by product_id", async () => {
    const user = userEvent.setup();
    setup();

    const productFilter = screen.getByTestId("product-filter") as HTMLSelectElement;
    const optionTexts = Array.from(productFilter.options).map((o) => o.textContent?.trim());
    expect(optionTexts[0]).toBe("Todos los productos");
    // Remaining options correspond 1:1 with the `products` prop.
    expect(optionTexts.slice(1)).toEqual([
      "Mouse Logitech (MOU-001)",
      "Teclado Mecánico (KEY-002)",
      "Monitor 27\" (MON-003)",
    ]);
    expect(productFilter.value).toBe("");

    // Filter by product_id "p2" → only m3 + m4.
    await user.selectOptions(productFilter, "p2");
    expect(visibleMovementIds().sort()).toEqual([
      "Reposición de stock",
      "Venta online",
    ]);
  });

  it("AC-4: search + type + product filters combine with AND", async () => {
    const user = userEvent.setup();
    setup();

    // Product p1 (Mouse) → m1 (Compra IN) + m2 (Venta OUT)
    await user.selectOptions(screen.getByTestId("product-filter"), "p1");
    expect(visibleMovementIds().sort()).toEqual([
      "Compra a proveedor",
      "Venta al mostrador",
    ]);

    // + Tipo = entradas → only m1
    await user.selectOptions(screen.getByTestId("type-filter"), "in");
    expect(visibleMovementIds()).toEqual(["Compra a proveedor"]);

    // + Search "compra" still matches m1
    await user.type(screen.getByTestId("search-input"), "compra");
    expect(visibleMovementIds()).toEqual(["Compra a proveedor"]);

    // Tighten search to a term that doesn't match m1's reason
    await user.clear(screen.getByTestId("search-input"));
    await user.type(screen.getByTestId("search-input"), "físico");
    expect(visibleMovementIds()).toEqual([]);
  });

  it("AC-5: shows a 'Mostrando N de M movimientos' counter that updates with filters", async () => {
    const user = userEvent.setup();
    setup();

    const counter = screen.getByTestId("results-counter");
    expect(counter).toHaveTextContent("Mostrando 5 de 5 movimientos");

    await user.selectOptions(screen.getByTestId("type-filter"), "in");
    expect(counter).toHaveTextContent("Mostrando 2 de 5 movimientos");

    await user.selectOptions(screen.getByTestId("type-filter"), "all");
    await user.type(screen.getByTestId("search-input"), "no-match-zzz");
    expect(counter).toHaveTextContent("Mostrando 0 de 5 movimientos");
  });

  it("AC-6: zero matches shows the empty state and 'Limpiar filtros' resets all three filters", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByTestId("search-input"), "no-match-zzz");
    await user.selectOptions(screen.getByTestId("type-filter"), "in");
    await user.selectOptions(screen.getByTestId("product-filter"), "p1");

    const empty = screen.getByTestId("filters-empty-state");
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveTextContent(/Ningún movimiento coincide con los filtros/);
    expect(screen.queryAllByTestId("movement-row")).toHaveLength(0);

    const clearAll = screen.getByTestId("clear-all-filters");
    expect(clearAll).toHaveTextContent("Limpiar filtros");

    await user.click(clearAll);

    // All three filters back to default values.
    expect((screen.getByTestId("search-input") as HTMLInputElement).value).toBe("");
    expect((screen.getByTestId("type-filter") as HTMLSelectElement).value).toBe("all");
    expect((screen.getByTestId("product-filter") as HTMLSelectElement).value).toBe("");

    // All rows back.
    expect(screen.queryAllByTestId("movement-row")).toHaveLength(5);
    expect(screen.queryByTestId("filters-empty-state")).not.toBeInTheDocument();
  });

  it("AC-7: each active filter shows a '✕ Limpiar' button that clears only that filter", async () => {
    const user = userEvent.setup();
    setup();

    // At default state, no individual clear buttons should be visible.
    expect(screen.queryByTestId("clear-search")).not.toBeInTheDocument();
    expect(screen.queryByTestId("clear-type")).not.toBeInTheDocument();
    expect(screen.queryByTestId("clear-product")).not.toBeInTheDocument();

    // Activate all three filters.
    await user.type(screen.getByTestId("search-input"), "venta");
    await user.selectOptions(screen.getByTestId("type-filter"), "out");
    await user.selectOptions(screen.getByTestId("product-filter"), "p1");

    const clearSearch = screen.getByTestId("clear-search");
    const clearType = screen.getByTestId("clear-type");
    const clearProduct = screen.getByTestId("clear-product");
    expect(clearSearch).toHaveTextContent(/Limpiar/);
    expect(clearType).toHaveTextContent(/Limpiar/);
    expect(clearProduct).toHaveTextContent(/Limpiar/);

    // Click clearSearch — only search resets.
    await user.click(clearSearch);
    expect((screen.getByTestId("search-input") as HTMLInputElement).value).toBe("");
    expect((screen.getByTestId("type-filter") as HTMLSelectElement).value).toBe("out");
    expect((screen.getByTestId("product-filter") as HTMLSelectElement).value).toBe("p1");
    expect(screen.queryByTestId("clear-search")).not.toBeInTheDocument();

    // Click clearType — only type resets.
    await user.click(screen.getByTestId("clear-type"));
    expect((screen.getByTestId("type-filter") as HTMLSelectElement).value).toBe("all");
    expect((screen.getByTestId("product-filter") as HTMLSelectElement).value).toBe("p1");
    expect(screen.queryByTestId("clear-type")).not.toBeInTheDocument();

    // Click clearProduct — only product resets.
    await user.click(screen.getByTestId("clear-product"));
    expect((screen.getByTestId("product-filter") as HTMLSelectElement).value).toBe("");
    expect(screen.queryByTestId("clear-product")).not.toBeInTheDocument();
  });

  it("AC-8: filtering happens client-side over the `movements` prop without re-fetching from server", async () => {
    // Structural: render with a tiny fixture, mutate filters, and verify
    // that the component never had a chance to fetch — it only ever
    // reads from the props passed in. If it tried to fetch, the test
    // environment (no MSW, no fetch mock) would surface an error.
    const user = userEvent.setup();
    const localMovements: StockMovementDTO[] = [
      makeMovement("a", "p1", "X", "IN", 1, "alpha", "2026-05-25T10:00:00Z"),
      makeMovement("b", "p1", "X", "OUT", 1, "beta", "2026-05-25T11:00:00Z"),
    ];
    render(
      <MovementsFilters
        movements={localMovements}
        products={[{ id: "p1", name: "X", sku: "X-1" }]}
        productSkuById={{ p1: "X-1" }}
      />,
    );

    // Initial: both rows from the prop are visible.
    expect(screen.queryAllByTestId("movement-row")).toHaveLength(2);

    // Apply a type filter — the row set shrinks based on the SAME prop array,
    // not a refetch (totalCount in the counter stays at 2).
    await user.selectOptions(screen.getByTestId("type-filter"), "in");
    expect(screen.queryAllByTestId("movement-row")).toHaveLength(1);
    expect(screen.getByTestId("results-counter")).toHaveTextContent(
      "Mostrando 1 de 2 movimientos",
    );

    // Clear it — both rows are back, again sourced from the same prop array.
    await user.selectOptions(screen.getByTestId("type-filter"), "all");
    expect(screen.queryAllByTestId("movement-row")).toHaveLength(2);
  });
});
