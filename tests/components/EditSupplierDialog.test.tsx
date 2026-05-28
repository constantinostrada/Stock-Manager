/**
 * Tests for EditSupplierDialog (T20). Covers open + pre-populated fields,
 * submit success path, and inline fieldErrors rendering.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditSupplierDialog } from "@/components/suppliers/EditSupplierDialog";
import type { ActionResult } from "@interfaces/actions/actionHelpers";
import type { SupplierDTO } from "@application/dtos/SupplierDTO";

const refreshSpy = vi.fn();
const toastSpy = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toastSpy(...args),
  useToast: () => ({ toasts: [], toast: toastSpy, dismiss: vi.fn() }),
}));

const sampleSupplier: SupplierDTO = {
  id: "sup-1",
  name: "ACME",
  email: "contact@acme.io",
  phone: "+54-9-11",
  notes: "Pago a 30 días",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function makeOk(name = "ACME Renombrado"): ActionResult<SupplierDTO> {
  return {
    success: true,
    data: { ...sampleSupplier, name },
  };
}

beforeEach(() => {
  refreshSpy.mockReset();
  toastSpy.mockReset();
});

describe("EditSupplierDialog", () => {
  it("renders a pencil-icon edit trigger and clicking opens the dialog with fields pre-populated", async () => {
    const user = userEvent.setup();
    render(
      <EditSupplierDialog
        supplier={sampleSupplier}
        updateSupplierAction={vi.fn()}
        onUpdated={refreshSpy}
      />,
    );

    const trigger = screen.getByTestId(`edit-supplier-trigger-${sampleSupplier.id}`);
    expect(trigger).toBeInTheDocument();
    expect(trigger.querySelector("svg")).not.toBeNull();
    expect(trigger).toHaveAttribute("aria-label", `Editar ${sampleSupplier.name}`);

    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/Editar proveedor/);

    expect(screen.getByLabelText(/Nombre/i)).toHaveValue("ACME");
    expect(screen.getByLabelText(/Email/i)).toHaveValue("contact@acme.io");
    expect(screen.getByLabelText(/Teléfono/i)).toHaveValue("+54-9-11");
    expect(screen.getByLabelText(/Notas/i)).toHaveValue("Pago a 30 días");
  });

  it("on submit success closes the modal, calls onUpdated, emits a success toast, and sends the supplier id", async () => {
    const action = vi.fn(async () => makeOk("ACME Renombrado"));

    const user = userEvent.setup();
    render(
      <EditSupplierDialog
        supplier={sampleSupplier}
        updateSupplierAction={action}
        onUpdated={refreshSpy}
      />,
    );

    await user.click(
      screen.getByTestId(`edit-supplier-trigger-${sampleSupplier.id}`),
    );
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText(/Nombre/i), {
      target: { value: "ACME Renombrado" },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("es-submit"));
    });

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sup-1",
        name: "ACME Renombrado",
        email: "contact@acme.io",
      }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy).toHaveBeenCalledTimes(1);
    const toastArg = toastSpy.mock.calls[0]?.[0] as { title?: string };
    expect(toastArg?.title).toMatch(/Proveedor actualizado/i);
  });

  it("renders an inline name error when the action returns code: CONFLICT with fieldErrors.name", async () => {
    const action = vi.fn(async () => ({
      success: false as const,
      error: "El nombre del proveedor ya existe.",
      code: "CONFLICT",
      fieldErrors: { name: "El nombre del proveedor ya existe." },
    }));

    const user = userEvent.setup();
    render(
      <EditSupplierDialog
        supplier={sampleSupplier}
        updateSupplierAction={action}
        onUpdated={refreshSpy}
      />,
    );

    await user.click(
      screen.getByTestId(`edit-supplier-trigger-${sampleSupplier.id}`),
    );
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText(/Nombre/i), {
      target: { value: "Otro" },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("es-submit"));
    });

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    const nameError = await screen.findByText(
      "El nombre del proveedor ya existe.",
    );
    expect(nameError).toBeInTheDocument();
    expect(nameError.getAttribute("id")).toBe("es-name-error");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(toastSpy).not.toHaveBeenCalled();
  });
});
