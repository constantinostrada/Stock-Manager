/**
 * T7 — Tests for EditProductDialog. Covers AC-2 through AC-7.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditProductDialog } from "@/components/products/EditProductDialog";
import type { ActionResult } from "@interfaces/actions/actionHelpers";
import type { ProductDTO } from "@application/dtos/ProductDTO";

const refreshSpy = vi.fn();
const toastSpy = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toastSpy(...args),
  useToast: () => ({ toasts: [], toast: toastSpy, dismiss: vi.fn() }),
}));

const sampleCategories = [
  { id: "cat-electro", name: "Electrónica" },
  { id: "cat-papel", name: "Papelería" },
];

const sampleProduct: ProductDTO = {
  id: "p-1",
  name: "Mouse",
  description: null,
  sku: "MS-01",
  price: 100,
  currency: "USD",
  categoryId: "cat-electro",
  categoryName: "Electrónica",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function makeOk(name = "Mouse óptico"): ActionResult<ProductDTO> {
  return {
    success: true,
    data: { ...sampleProduct, name },
  };
}

beforeEach(() => {
  refreshSpy.mockReset();
  toastSpy.mockReset();
});

describe("EditProductDialog", () => {
  it("AC-2 + AC-3: renders a discreet pencil-icon edit button and clicking opens 'Editar producto' Dialog with fields pre-populated", async () => {
    const user = userEvent.setup();
    render(
      <EditProductDialog
        product={sampleProduct}
        currentStock={7}
        categories={sampleCategories}
        updateProductAction={vi.fn()}
        onUpdated={refreshSpy}
      />,
    );

    const trigger = screen.getByTestId(`edit-product-trigger-${sampleProduct.id}`);
    expect(trigger).toBeInTheDocument();
    // Discrete: icon-only with sr-only label
    expect(trigger.querySelector("svg")).not.toBeNull();
    expect(trigger).toHaveTextContent(/Editar/);

    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/Editar producto/);

    // Fields pre-populated with current values
    expect(screen.getByLabelText(/SKU/i)).toHaveValue("MS-01");
    expect(screen.getByLabelText(/^Nombre$/i)).toHaveValue("Mouse");
    expect(screen.getByLabelText(/Stock actual/i)).toHaveValue(7);
    expect(screen.getByLabelText(/^Precio$/i)).toHaveValue(100);
  });

  it("AC-4: the SKU input is read-only / disabled", async () => {
    const user = userEvent.setup();
    render(
      <EditProductDialog
        product={sampleProduct}
        currentStock={0}
        categories={sampleCategories}
        updateProductAction={vi.fn()}
        onUpdated={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId(`edit-product-trigger-${sampleProduct.id}`));
    const skuInput = screen.getByLabelText(/SKU/i) as HTMLInputElement;
    expect(skuInput).toBeDisabled();
    expect(skuInput).toHaveAttribute("readOnly");
  });

  it("AC-5: on submit success the modal closes, refresh callback fires, and 'Producto actualizado' toast is emitted", async () => {
    const action = vi.fn(async () => makeOk("Mouse óptico Pro"));
    const user = userEvent.setup();
    render(
      <EditProductDialog
        product={sampleProduct}
        currentStock={3}
        categories={sampleCategories}
        updateProductAction={action}
        onUpdated={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId(`edit-product-trigger-${sampleProduct.id}`));
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText(/^Nombre$/i), {
      target: { value: "Mouse óptico Pro" },
    });
    fireEvent.change(screen.getByLabelText(/^Precio$/i), {
      target: { value: "150.5" },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("ep-submit"));
    });

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action).toHaveBeenCalledWith({
      id: "p-1",
      name: "Mouse óptico Pro",
      categoryId: "cat-electro",
      price: 150.5,
      currency: "USD",
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy).toHaveBeenCalledTimes(1);
    const toastArg = toastSpy.mock.calls[0]?.[0] as { title?: string };
    expect(toastArg?.title).toMatch(/Producto actualizado/i);
  });

  it("AC-6: shows inline error when validation fails (price <= 0)", async () => {
    const action = vi.fn(async () => ({
      success: false as const,
      error: "El precio debe ser mayor a 0.",
      code: "VALIDATION_ERROR",
      fieldErrors: { price: "El precio debe ser mayor a 0." },
    }));

    const user = userEvent.setup();
    render(
      <EditProductDialog
        product={sampleProduct}
        currentStock={0}
        categories={sampleCategories}
        updateProductAction={action}
        onUpdated={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId(`edit-product-trigger-${sampleProduct.id}`));
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText(/^Precio$/i), { target: { value: "0" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("ep-submit"));
    });

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    const priceError = await screen.findByText("El precio debe ser mayor a 0.");
    expect(priceError).toBeInTheDocument();
    expect(priceError.getAttribute("id")).toBe("ep-price-error");

    // Dialog stays open + no success toast
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it("AC-7: submit button shows a loading label and is disabled while the action is pending", async () => {
    let resolveAction: ((v: ActionResult<ProductDTO>) => void) | null = null;
    const action = vi.fn(
      () =>
        new Promise<ActionResult<ProductDTO>>((res) => {
          resolveAction = res;
        }),
    );

    const user = userEvent.setup();
    render(
      <EditProductDialog
        product={sampleProduct}
        currentStock={0}
        categories={sampleCategories}
        updateProductAction={action}
        onUpdated={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId(`edit-product-trigger-${sampleProduct.id}`));
    await screen.findByRole("dialog");

    const submit = screen.getByTestId("ep-submit");
    fireEvent.click(submit);

    await waitFor(() => {
      expect(submit).toBeDisabled();
      expect(submit).toHaveTextContent(/Guardando/i);
    });

    await act(async () => {
      resolveAction?.(makeOk());
    });
  });
});
