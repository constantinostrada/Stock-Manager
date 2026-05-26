/**
 * Tests NewMovementDialog (T14).
 *
 * AC-2: "+ Nuevo movimiento" button rendered at the top of /movements.
 * AC-3: Click opens shadcn Dialog with the four form fields (producto select,
 *       tipo select, cantidad, razón textarea optional).
 * AC-4: inline errors render with role="alert" + scoped id.
 * AC-5: successful submit closes the modal, refreshes (onSuccess fires), and
 *       fires a success toast.
 * AC-7: loading state on Submit button — "Guardando…" + disabled while pending.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewMovementDialog } from "@/components/stock/NewMovementDialog";
import type { ActionResult } from "@interfaces/actions/actionHelpers";
import type { StockLevelDTO } from "@application/dtos/StockDTO";

const toastSpy = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toastSpy(...args),
  useToast: () => ({ toasts: [], toast: toastSpy, dismiss: vi.fn() }),
}));

const PRODUCTS = [
  { id: "p1", name: "Mouse", sku: "MS-01" },
  { id: "p2", name: "Teclado", sku: "KB-02" },
];

function makeOk(quantity = 8, productId = "p1"): ActionResult<StockLevelDTO> {
  return {
    success: true,
    data: {
      id: "sl1",
      productId,
      productName: productId === "p1" ? "Mouse" : "Teclado",
      productSku: productId === "p1" ? "MS-01" : "KB-02",
      quantity,
      minQuantity: 0,
      isLowStock: false,
      isOutOfStock: false,
      updatedAt: new Date().toISOString(),
    },
  };
}

beforeEach(() => {
  toastSpy.mockReset();
});

describe("NewMovementDialog (T14)", () => {
  it("AC-2: renders the '+ Nuevo movimiento' trigger button", () => {
    render(
      <NewMovementDialog
        products={PRODUCTS}
        createMovementAction={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    const trigger = screen.getByTestId("new-movement-trigger");
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent(/Nuevo movimiento/i);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("AC-3: clicking the trigger opens a Dialog with producto select, tipo select, cantidad input, razón textarea (razón is OPTIONAL)", async () => {
    const user = userEvent.setup();
    render(
      <NewMovementDialog
        products={PRODUCTS}
        createMovementAction={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("new-movement-trigger"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // producto: native select listing products by name + SKU
    const producto = screen.getByTestId("nm-producto") as HTMLSelectElement;
    expect(producto).toBeInTheDocument();
    expect(producto.required).toBe(true);
    expect(producto.tagName).toBe("SELECT");
    // Option labels include "{name} ({sku})"
    expect(screen.getByText("Mouse (MS-01)")).toBeInTheDocument();
    expect(screen.getByText("Teclado (KB-02)")).toBeInTheDocument();

    // tipo: native select with ENTRADA / SALIDA / AJUSTE
    const tipo = screen.getByTestId("nm-tipo") as HTMLSelectElement;
    expect(tipo).toBeInTheDocument();
    const tipoOptions = Array.from(tipo.options).map((o) => o.value);
    expect(tipoOptions).toEqual(["ENTRADA", "SALIDA", "AJUSTE"]);
    expect(tipo.value).toBe("ENTRADA");

    // cantidad: integer > 0 (min=1, step=1)
    const cantidad = screen.getByLabelText(/Cantidad/i) as HTMLInputElement;
    expect(cantidad.type).toBe("number");
    expect(cantidad.min).toBe("1");
    expect(cantidad.step).toBe("1");
    expect(cantidad.required).toBe(true);

    // razón: textarea, NOT required
    const razon = screen.getByTestId("nm-razon") as HTMLTextAreaElement;
    expect(razon).toBeInTheDocument();
    expect(razon.tagName).toBe("TEXTAREA");
    expect(razon.required).toBe(false);
  });

  it("AC-4: insufficient-stock SALIDA shows the Spanish inline error next to cantidad (dialog stays open)", async () => {
    const action = vi.fn(async () => ({
      success: false as const,
      error:
        "Stock insuficiente para esta salida (solicitado 10, disponible 3).",
      code: "DOMAIN_ERROR",
      fieldErrors: {
        cantidad:
          "Stock insuficiente para esta salida (solicitado 10, disponible 3).",
      },
    }));
    const user = userEvent.setup();
    render(
      <NewMovementDialog
        products={PRODUCTS}
        createMovementAction={action}
        onSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("new-movement-trigger"));
    fireEvent.change(screen.getByTestId("nm-producto"), {
      target: { value: "p1" },
    });
    fireEvent.change(screen.getByTestId("nm-tipo"), {
      target: { value: "SALIDA" },
    });
    fireEvent.change(screen.getByLabelText(/Cantidad/i), {
      target: { value: "10" },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("nm-submit"));
    });

    const inline = await screen.findByText(/Stock insuficiente para esta salida/i);
    expect(inline.getAttribute("id")).toBe("nm-cantidad-error");
    expect(inline.getAttribute("role")).toBe("alert");
    // Dialog stays open so the user can correct the cantidad.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("AC-4: producto-not-exist surfaces fieldErrors.productId inline on the producto select", async () => {
    const action = vi.fn(async () => ({
      success: false as const,
      error: "Producto no existe.",
      code: "NOT_FOUND",
      fieldErrors: { productId: "Producto no existe." },
    }));
    const user = userEvent.setup();
    render(
      <NewMovementDialog
        products={PRODUCTS}
        createMovementAction={action}
        onSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("new-movement-trigger"));
    fireEvent.change(screen.getByTestId("nm-producto"), {
      target: { value: "p1" },
    });
    fireEvent.change(screen.getByLabelText(/Cantidad/i), {
      target: { value: "3" },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("nm-submit"));
    });

    const inline = await screen.findByText(/Producto no existe/i);
    expect(inline.getAttribute("id")).toBe("nm-producto-error");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("AC-5: on success the modal closes, onSuccess fires once, and a toast is emitted", async () => {
    const action = vi.fn(async () => makeOk(12));
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    render(
      <NewMovementDialog
        products={PRODUCTS}
        createMovementAction={action}
        onSuccess={onSuccess}
      />,
    );

    await user.click(screen.getByTestId("new-movement-trigger"));
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByTestId("nm-producto"), {
      target: { value: "p1" },
    });
    fireEvent.change(screen.getByLabelText(/Cantidad/i), {
      target: { value: "5" },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("nm-submit"));
    });

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    // razon is omitted when empty (AC-3).
    expect(action).toHaveBeenCalledWith({
      productId: "p1",
      tipo: "ENTRADA",
      cantidad: 5,
    });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(toastSpy).toHaveBeenCalledTimes(1);
    // The toast description includes the product name and the new stock value.
    const toastArg = toastSpy.mock.calls[0]![0] as {
      title: string;
      description: string;
    };
    expect(toastArg.title).toMatch(/Movimiento registrado/i);
    expect(toastArg.description).toMatch(/Mouse/);
    expect(toastArg.description).toMatch(/12/);
  });

  it("AC-5: razon when filled is trimmed and included in the payload", async () => {
    const action = vi.fn(async () => makeOk(8));
    const user = userEvent.setup();

    render(
      <NewMovementDialog
        products={PRODUCTS}
        createMovementAction={action}
        onSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("new-movement-trigger"));
    fireEvent.change(screen.getByTestId("nm-producto"), {
      target: { value: "p2" },
    });
    fireEvent.change(screen.getByTestId("nm-tipo"), {
      target: { value: "AJUSTE" },
    });
    fireEvent.change(screen.getByLabelText(/Cantidad/i), {
      target: { value: "7" },
    });
    fireEvent.change(screen.getByTestId("nm-razon"), {
      target: { value: "  Conteo físico  " },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("nm-submit"));
    });

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action).toHaveBeenCalledWith({
      productId: "p2",
      tipo: "AJUSTE",
      cantidad: 7,
      razon: "Conteo físico",
    });
  });

  it("AC-7: submit button shows 'Guardando…' and is disabled while the action is pending", async () => {
    let resolveAction: ((value: ActionResult<StockLevelDTO>) => void) | null =
      null;
    const action = vi.fn(
      () =>
        new Promise<ActionResult<StockLevelDTO>>((resolve) => {
          resolveAction = resolve;
        }),
    );
    const user = userEvent.setup();

    render(
      <NewMovementDialog
        products={PRODUCTS}
        createMovementAction={action}
        onSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("new-movement-trigger"));
    fireEvent.change(screen.getByTestId("nm-producto"), {
      target: { value: "p1" },
    });
    fireEvent.change(screen.getByLabelText(/Cantidad/i), {
      target: { value: "2" },
    });

    const submitBtn = screen.getByTestId("nm-submit") as HTMLButtonElement;
    expect(submitBtn).not.toBeDisabled();
    expect(submitBtn.textContent).toMatch(/Registrar movimiento/i);

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // While pending: label flips to "Guardando…" and the button is disabled.
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
      expect(submitBtn.textContent).toMatch(/Guardando/);
    });

    // Resolve and verify the dialog closes (sanity end-state).
    await act(async () => {
      resolveAction?.(makeOk(10));
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
