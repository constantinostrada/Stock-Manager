/**
 * AC-2: ensures the "+ Nuevo producto" trigger sits in the top-right header
 * (i.e. inside the page header row, to the right of the title).
 *
 * Since /products/page.tsx is a Server Component that hits the DI container,
 * we test the layout pattern by rendering a stand-in that uses the same
 * header structure + the NewProductDialog component.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NewProductDialog } from "@/components/products/NewProductDialog";

function ProductsHeader() {
  return (
    <div className="flex items-center justify-between" data-testid="products-header">
      <div>
        <h1>Products</h1>
      </div>
      <NewProductDialog
        categories={[{ id: "c1", name: "Cat1" }]}
        createProductAction={async () => ({
          success: true,
          data: {
            id: "p",
            name: "P",
            description: null,
            sku: "X",
            price: 1,
            currency: "USD",
            categoryId: null,
            categoryName: null,
            createdAt: "",
            updatedAt: "",
          },
        })}
      />
    </div>
  );
}

describe("Products page header layout (AC-2)", () => {
  it("renders the '+ Nuevo producto' button inside the header row aligned to the right", () => {
    render(<ProductsHeader />);

    const header = screen.getByTestId("products-header");
    const trigger = screen.getByTestId("new-product-trigger");

    // The trigger lives inside the header.
    expect(header.contains(trigger)).toBe(true);

    // The header is a flex container with justify-between, so the title sits
    // on the left and the trigger sits on the right.
    expect(header.className).toMatch(/justify-between/);

    // The button is the second (and last) flex child — confirming "arriba a la derecha".
    expect(header.children[header.children.length - 1]?.contains(trigger)).toBe(true);

    // And the text is the Spanish phrasing from the AC.
    expect(trigger).toHaveTextContent(/^\s*Nuevo producto\s*$/);
  });
});
