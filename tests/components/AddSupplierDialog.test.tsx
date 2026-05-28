/**
 * Tests for AddSupplierDialog. Covers AC-4 (button opens dialog with form) and AC-5.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddSupplierDialog } from "@/components/suppliers/AddSupplierDialog";
import type { ActionResult } from "@interfaces/actions/actionHelpers";
import type { SupplierDTO } from "@application/dtos/SupplierDTO";

const refreshSpy = vi.fn();
const toastSpy = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toastSpy(...args),
  useToast: () => ({ toasts: [], toast: toastSpy, dismiss: vi.fn() }),
}));

function makeOk(name = "ACME"): ActionResult<SupplierDTO> {
  return {
    success: true,
    data: {
      id: "sup-1",
      name,
      email: null,
      phone: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

beforeEach(() => {
  refreshSpy.mockReset();
  toastSpy.mockReset();
});

describe("AddSupplierDialog", () => {
  it("renders the 'Add supplier' trigger and opens a dialog with name/email/phone/notes fields", async () => {
    const user = userEvent.setup();
    render(
      <AddSupplierDialog
        createSupplierAction={vi.fn()}
        onCreated={refreshSpy}
      />,
    );

    const trigger = screen.getByTestId("add-supplier-trigger");
    expect(trigger).toHaveTextContent(/Add supplier/);

    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notas/i)).toBeInTheDocument();
  });

  it("shows an inline name error when the action returns code: CONFLICT with fieldErrors.name", async () => {
    const action = vi.fn(async () => ({
      success: false as const,
      error: "El nombre del proveedor ya existe.",
      code: "CONFLICT",
      fieldErrors: { name: "El nombre del proveedor ya existe." },
    }));

    const user = userEvent.setup();
    render(
      <AddSupplierDialog
        createSupplierAction={action}
        onCreated={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId("add-supplier-trigger"));
    fireEvent.change(screen.getByLabelText(/Nombre/i), {
      target: { value: "ACME" },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("as-submit"));
    });

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    const nameError = await screen.findByText(
      "El nombre del proveedor ya existe.",
    );
    expect(nameError).toBeInTheDocument();
    expect(nameError.getAttribute("id")).toBe("as-name-error");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it("on submit success closes the modal, calls onCreated, and emits a success toast", async () => {
    const action = vi.fn(async () => makeOk("ACME"));

    const user = userEvent.setup();
    render(
      <AddSupplierDialog
        createSupplierAction={action}
        onCreated={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId("add-supplier-trigger"));
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText(/Nombre/i), {
      target: { value: "ACME" },
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "info@acme.io" },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("as-submit"));
    });

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action).toHaveBeenCalledWith({
      name: "ACME",
      email: "info@acme.io",
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy).toHaveBeenCalledTimes(1);
    const toastArg = toastSpy.mock.calls[0]?.[0] as { title?: string };
    expect(toastArg?.title).toMatch(/Proveedor creado/i);
  });
});
