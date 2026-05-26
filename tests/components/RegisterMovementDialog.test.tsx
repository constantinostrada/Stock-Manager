/**
 * Tests RegisterMovementDialog.
 *
 * AC-3: Click on the +/- trigger opens a Dialog whose form has:
 *       - cantidad (number > 0)
 *       - razón (required, placeholder "Venta / Compra / Pérdida / Ajuste / Rotura")
 *
 * AC-4: Stock en tabla se actualiza tras registrar — verified here via the
 *       onSuccess callback being fired exactly once after a successful submit
 *       (the page wires onSuccess to router.refresh()).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterMovementDialog } from "@/components/stock/RegisterMovementDialog";
import type { ActionResult } from "@interfaces/actions/actionHelpers";
import type { StockLevelDTO } from "@application/dtos/StockDTO";

const toastSpy = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toastSpy(...args),
  useToast: () => ({ toasts: [], toast: toastSpy, dismiss: vi.fn() }),
}));

function makeOk(quantity = 8): ActionResult<StockLevelDTO> {
  return {
    success: true,
    data: {
      id: "sl1",
      productId: "p1",
      productName: "Mouse",
      productSku: "MS-01",
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

describe("RegisterMovementDialog", () => {
  it("AC-3: clicking the trigger opens a Dialog with cantidad + razón fields (razón placeholder matches the AC)", async () => {
    const user = userEvent.setup();
    render(
      <RegisterMovementDialog
        productId="p1"
        productName="Mouse"
        productSku="MS-01"
        tipo="ENTRADA"
        registerMovementAction={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    const trigger = screen.getByTestId("entrada-trigger-p1");
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // cantidad field is a numeric input with min=1 (i.e. > 0).
    const cantidad = screen.getByLabelText(/Cantidad/i) as HTMLInputElement;
    expect(cantidad).toBeInTheDocument();
    expect(cantidad.type).toBe("number");
    expect(cantidad.min).toBe("1");
    expect(cantidad.required).toBe(true);

    // razón field is required + has the exact AC placeholder.
    const razon = screen.getByLabelText(/Razón/i) as HTMLInputElement;
    expect(razon).toBeInTheDocument();
    expect(razon.required).toBe(true);
    expect(razon.placeholder).toBe("Venta / Compra / Pérdida / Ajuste / Rotura");
  });

  it("AC-3: cantidad <= 0 surfaces fieldErrors.cantidad inline (form does not close)", async () => {
    const action = vi.fn(async () => ({
      success: false as const,
      error: "La cantidad debe ser mayor que cero.",
      code: "VALIDATION_ERROR",
      fieldErrors: { cantidad: "La cantidad debe ser mayor que cero." },
    }));
    const user = userEvent.setup();
    render(
      <RegisterMovementDialog
        productId="p1"
        productName="Mouse"
        tipo="ENTRADA"
        registerMovementAction={action}
        onSuccess={vi.fn()}
      />,
    );
    await user.click(screen.getByTestId("entrada-trigger-p1"));

    fireEvent.change(screen.getByLabelText(/Cantidad/i), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText(/Razón/i), { target: { value: "Compra" } });
    await act(async () => {
      fireEvent.click(screen.getByTestId("rm-submit"));
    });

    const cantidadError = await screen.findByText(/mayor que cero/i);
    expect(cantidadError.getAttribute("id")).toBe("rm-cantidad-error");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("AC-4: on successful registration the dialog closes and onSuccess (router.refresh equivalent) is fired exactly once", async () => {
    const action = vi.fn(async () => makeOk(12));
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    render(
      <RegisterMovementDialog
        productId="p1"
        productName="Mouse"
        productSku="MS-01"
        tipo="ENTRADA"
        registerMovementAction={action}
        onSuccess={onSuccess}
      />,
    );

    await user.click(screen.getByTestId("entrada-trigger-p1"));
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText(/Cantidad/i), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText(/Razón/i), { target: { value: "Compra" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("rm-submit"));
    });

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action).toHaveBeenCalledWith({
      productId: "p1",
      tipo: "ENTRADA",
      cantidad: 5,
      razon: "Compra",
    });

    // Dialog closes and refresh callback fires — this is the "stock se actualiza" wiring.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(toastSpy).toHaveBeenCalledTimes(1);
  });

  it("AC-1 UI side: insufficient-stock SALIDA shows the Spanish descriptive error inline", async () => {
    const action = vi.fn(async () => ({
      success: false as const,
      error:
        "Stock insuficiente: la cantidad solicitada (10) supera el stock actual (3).",
      code: "DOMAIN_ERROR",
      fieldErrors: {
        cantidad:
          "Stock insuficiente: la cantidad solicitada (10) supera el stock actual (3).",
      },
    }));
    const user = userEvent.setup();
    render(
      <RegisterMovementDialog
        productId="p1"
        productName="Mouse"
        tipo="SALIDA"
        registerMovementAction={action}
        onSuccess={vi.fn()}
      />,
    );

    // SALIDA has its own trigger id.
    expect(screen.getByTestId("salida-trigger-p1")).toBeInTheDocument();
    await user.click(screen.getByTestId("salida-trigger-p1"));

    fireEvent.change(screen.getByLabelText(/Cantidad/i), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText(/Razón/i), { target: { value: "Venta" } });
    await act(async () => {
      fireEvent.click(screen.getByTestId("rm-submit"));
    });

    const inline = await screen.findByText(/Stock insuficiente/);
    expect(inline.getAttribute("id")).toBe("rm-cantidad-error");
    // Dialog stays open so the user can correct the cantidad.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
