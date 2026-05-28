/**
 * Tests for NewProductDialog. Covers AC-2 through AC-6.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewProductDialog } from "@/components/products/NewProductDialog";
import type { ActionResult } from "@interfaces/actions/actionHelpers";
import type { ProductDTO } from "@application/dtos/ProductDTO";

const refreshSpy = vi.fn();
const toastSpy = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toastSpy(...args),
  useToast: () => ({ toasts: [], toast: toastSpy, dismiss: vi.fn() }),
}));

// We DO want the page-level page integration test too, but the dialog itself
// is the unit under test for the click-to-open / form / inline error / loading
// state behaviour.

const sampleCategories = [
  { id: "cat-electro", name: "Electrónica" },
  { id: "cat-papel", name: "Papelería" },
];

function makeOk(name = "Mouse"): ActionResult<ProductDTO> {
  return {
    success: true,
    data: {
      id: "p1",
      name,
      description: null,
      sku: "MS-01",
      price: 100,
      currency: "USD",
      categoryId: null,
      categoryName: null,
      supplierId: null,
      supplierName: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

const sampleSuppliers = [
  { id: "sup-acme", name: "Acme S.A." },
  { id: "sup-globex", name: "Globex" },
];

beforeEach(() => {
  refreshSpy.mockReset();
  toastSpy.mockReset();
});

describe("NewProductDialog", () => {
  it("AC-2 + AC-3: renders the '+ Nuevo producto' trigger and opens a Dialog with the 5 required fields", async () => {
    const user = userEvent.setup();
    render(
      <NewProductDialog
        categories={sampleCategories}
        createProductAction={vi.fn()}
        onCreated={refreshSpy}
      />,
    );

    const trigger = screen.getByTestId("new-product-trigger");
    expect(trigger).toHaveTextContent(/Nuevo producto/);

    // Modal not open initially
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(trigger);

    // Dialog now open
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // All 5 required fields present
    expect(screen.getByLabelText(/SKU/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nombre$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Categoría/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Stock inicial/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Precio$/i)).toBeInTheDocument();
  });

  it("AC-4: shows inline error on the SKU field when the action returns code: 'CONFLICT' with sku fieldError", async () => {
    const action = vi.fn(async () => ({
      success: false as const,
      error: 'A product with SKU "MS-01" already exists.',
      code: "CONFLICT",
      fieldErrors: { sku: "El SKU ya existe." },
    }));

    const user = userEvent.setup();
    render(
      <NewProductDialog
        categories={sampleCategories}
        createProductAction={action}
        onCreated={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId("new-product-trigger"));

    fireEvent.change(screen.getByLabelText(/SKU/i), { target: { value: "MS-01" } });
    fireEvent.change(screen.getByLabelText(/^Nombre$/i), { target: { value: "Mouse" } });
    fireEvent.change(screen.getByLabelText(/Stock inicial/i), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText(/^Precio$/i), { target: { value: "100" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("np-submit"));
    });

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1);
    });

    // Inline error is rendered next to the SKU field, NOT as a global toast.
    const skuError = await screen.findByText("El SKU ya existe.");
    expect(skuError).toBeInTheDocument();
    expect(skuError.getAttribute("id")).toBe("np-sku-error");

    // The dialog stayed open (no success path).
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // No success toast emitted.
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it("AC-5: on submit success the modal closes, the refresh callback fires, and a success toast is emitted", async () => {
    const action = vi.fn(async () => makeOk("Mouse óptico"));

    const user = userEvent.setup();
    render(
      <NewProductDialog
        categories={sampleCategories}
        createProductAction={action}
        onCreated={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId("new-product-trigger"));
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText(/SKU/i), { target: { value: "MS-02" } });
    fireEvent.change(screen.getByLabelText(/^Nombre$/i), {
      target: { value: "Mouse óptico" },
    });
    fireEvent.change(screen.getByLabelText(/Stock inicial/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/^Precio$/i), { target: { value: "250.5" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("np-submit"));
    });

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    // The action received parsed numbers and the optional categoryId omitted.
    expect(action).toHaveBeenCalledWith({
      sku: "MS-02",
      name: "Mouse óptico",
      categoryId: undefined,
      supplierId: null,
      stockInicial: 3,
      price: 250.5,
    });

    // Modal closes (dialog disappears).
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    // Refresh fired and success toast emitted.
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy).toHaveBeenCalledTimes(1);
    const toastArg = toastSpy.mock.calls[0]?.[0] as { title?: string };
    expect(toastArg?.title).toMatch(/Producto creado/i);
  });

  it("T18: renders 'Proveedor' dropdown with 'Sin proveedor' option + every supplier passed via props", async () => {
    const user = userEvent.setup();
    render(
      <NewProductDialog
        categories={sampleCategories}
        suppliers={sampleSuppliers}
        createProductAction={vi.fn()}
        onCreated={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId("new-product-trigger"));
    await screen.findByRole("dialog");

    // Trigger labelled "Proveedor" exists and shows the default placeholder.
    const trigger = screen.getByTestId("np-supplier");
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent(/Sin proveedor/);

    // Open the Select and verify every supplier option is rendered.
    await user.click(trigger);
    const sinProveedor = await screen.findByRole("option", {
      name: "Sin proveedor",
    });
    expect(sinProveedor).toBeInTheDocument();
    for (const s of sampleSuppliers) {
      expect(
        screen.getByRole("option", { name: s.name }),
      ).toBeInTheDocument();
    }
  });

  it("T18: when a supplier is selected, the action receives the supplierId", async () => {
    const action = vi.fn(async () => makeOk("Foo"));
    const user = userEvent.setup();
    render(
      <NewProductDialog
        categories={sampleCategories}
        suppliers={sampleSuppliers}
        createProductAction={action}
        onCreated={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId("new-product-trigger"));
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText(/SKU/i), {
      target: { value: "FOO-01" },
    });
    fireEvent.change(screen.getByLabelText(/^Nombre$/i), {
      target: { value: "Foo" },
    });
    fireEvent.change(screen.getByLabelText(/Stock inicial/i), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/^Precio$/i), {
      target: { value: "10" },
    });

    // Open Select and pick Acme.
    await user.click(screen.getByTestId("np-supplier"));
    const acmeOption = await screen.findByRole("option", {
      name: "Acme S.A.",
    });
    await user.click(acmeOption);

    await act(async () => {
      fireEvent.click(screen.getByTestId("np-submit"));
    });

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action).toHaveBeenCalledWith(
      expect.objectContaining({ supplierId: "sup-acme" }),
    );
  });

  it("AC-6: submit button shows a loading label and is disabled while the action is pending", async () => {
    let resolveAction: ((v: ActionResult<ProductDTO>) => void) | null = null;
    const action = vi.fn(
      () =>
        new Promise<ActionResult<ProductDTO>>((res) => {
          resolveAction = res;
        }),
    );

    const user = userEvent.setup();
    render(
      <NewProductDialog
        categories={sampleCategories}
        createProductAction={action}
        onCreated={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId("new-product-trigger"));
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText(/SKU/i), { target: { value: "MS-03" } });
    fireEvent.change(screen.getByLabelText(/^Nombre$/i), { target: { value: "X" } });
    fireEvent.change(screen.getByLabelText(/Stock inicial/i), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText(/^Precio$/i), { target: { value: "10" } });

    // Submit but DO NOT resolve the action yet.
    const submit = screen.getByTestId("np-submit");
    fireEvent.click(submit);

    // Loading state on the submit button.
    await waitFor(() => {
      expect(submit).toBeDisabled();
      expect(submit).toHaveTextContent(/Creando/i);
    });

    // Resolve to clean up.
    await act(async () => {
      resolveAction?.(makeOk());
    });
  });
});
