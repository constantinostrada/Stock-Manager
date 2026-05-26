/**
 * T10 — Tests for DeleteProductButton. Covers AC-2 through AC-9.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteProductButton } from "@/components/products/DeleteProductButton";
import type { ActionResult } from "@interfaces/actions/actionHelpers";

const refreshSpy = vi.fn();
const toastSpy = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toastSpy(...args),
  useToast: () => ({ toasts: [], toast: toastSpy, dismiss: vi.fn() }),
}));

function makeOk(): ActionResult<void> {
  return { success: true, data: undefined };
}

beforeEach(() => {
  refreshSpy.mockReset();
  toastSpy.mockReset();
});

describe("DeleteProductButton", () => {
  it("AC-2: renders a discreet destructive trash-icon trigger", () => {
    render(
      <DeleteProductButton
        productId="p-1"
        productName="Mouse"
        productSku="MS-01"
        movementCount={0}
        deleteProductAction={vi.fn()}
        onDeleted={refreshSpy}
      />,
    );

    const trigger = screen.getByTestId("delete-product-trigger-p-1");
    expect(trigger).toBeInTheDocument();
    // Trash icon (svg) is present and the trigger uses the destructive color.
    expect(trigger.querySelector("svg")).not.toBeNull();
    expect(trigger.className).toMatch(/text-destructive/);
    expect(trigger).toHaveAccessibleName(/Eliminar Mouse/);
  });

  it("AC-3 + AC-4: click opens a Dialog with title 'Eliminar producto'", async () => {
    const user = userEvent.setup();
    render(
      <DeleteProductButton
        productId="p-1"
        productName="Mouse"
        productSku="MS-01"
        movementCount={0}
        deleteProductAction={vi.fn()}
        onDeleted={refreshSpy}
      />,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByTestId("delete-product-trigger-p-1"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Eliminar producto");
  });

  it("AC-5: confirmation message includes name + SKU and movement count when N>0", async () => {
    const user = userEvent.setup();
    render(
      <DeleteProductButton
        productId="p-1"
        productName="Mouse"
        productSku="MS-01"
        movementCount={3}
        deleteProductAction={vi.fn()}
        onDeleted={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId("delete-product-trigger-p-1"));
    const message = await screen.findByTestId("delete-product-message");
    expect(message.textContent).toBe(
      "¿Eliminar 'Mouse' (SKU MS-01)? Esta acción no se puede deshacer y eliminará también 3 movimientos asociados.",
    );
  });

  it("AC-5: when N=0, the movements clause is omitted", async () => {
    const user = userEvent.setup();
    render(
      <DeleteProductButton
        productId="p-1"
        productName="Mouse"
        productSku="MS-01"
        movementCount={0}
        deleteProductAction={vi.fn()}
        onDeleted={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId("delete-product-trigger-p-1"));
    const message = await screen.findByTestId("delete-product-message");
    expect(message.textContent).toBe(
      "¿Eliminar 'Mouse' (SKU MS-01)? Esta acción no se puede deshacer.",
    );
    expect(message.textContent).not.toMatch(/movimiento/);
  });

  it("AC-6: 'Cancelar' (outline) closes the modal without firing the action", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteProductButton
        productId="p-1"
        productName="Mouse"
        productSku="MS-01"
        movementCount={0}
        deleteProductAction={action}
        onDeleted={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId("delete-product-trigger-p-1"));
    await screen.findByRole("dialog");

    const cancel = screen.getByRole("button", { name: /Cancelar/ });
    expect(cancel).toBeInTheDocument();
    await user.click(cancel);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(action).not.toHaveBeenCalled();
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("AC-7: clicking 'Eliminar' executes the action, closes the modal, refreshes, and shows a 'Producto eliminado' toast (with movements suffix when N>0)", async () => {
    const action = vi.fn(async () => makeOk());
    const user = userEvent.setup();
    render(
      <DeleteProductButton
        productId="p-1"
        productName="Mouse"
        productSku="MS-01"
        movementCount={3}
        deleteProductAction={action}
        onDeleted={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId("delete-product-trigger-p-1"));
    await screen.findByRole("dialog");

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-product-submit"));
    });

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action).toHaveBeenCalledWith({ id: "p-1" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy).toHaveBeenCalledTimes(1);
    const toastArg = toastSpy.mock.calls[0]?.[0] as {
      title?: string;
      description?: string;
    };
    expect(toastArg?.title).toBe("Producto eliminado");
    expect(toastArg?.description).toMatch(/3 movimientos también/);
  });

  it("AC-7: success toast omits the movements suffix when N=0", async () => {
    const action = vi.fn(async () => makeOk());
    const user = userEvent.setup();
    render(
      <DeleteProductButton
        productId="p-1"
        productName="Mouse"
        productSku="MS-01"
        movementCount={0}
        deleteProductAction={action}
        onDeleted={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId("delete-product-trigger-p-1"));
    await screen.findByRole("dialog");

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-product-submit"));
    });

    await waitFor(() => expect(toastSpy).toHaveBeenCalledTimes(1));
    const toastArg = toastSpy.mock.calls[0]?.[0] as {
      title?: string;
      description?: string;
    };
    expect(toastArg?.title).toBe("Producto eliminado");
    expect(toastArg?.description ?? "").not.toMatch(/movimiento/);
  });

  it("AC-8: if the server action fails, shows a destructive toast with the returned error", async () => {
    const action = vi.fn(async () => ({
      success: false as const,
      error: "Producto no encontrado",
      code: "NOT_FOUND",
    }));
    const user = userEvent.setup();
    render(
      <DeleteProductButton
        productId="p-1"
        productName="Mouse"
        productSku="MS-01"
        movementCount={0}
        deleteProductAction={action}
        onDeleted={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId("delete-product-trigger-p-1"));
    await screen.findByRole("dialog");

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-product-submit"));
    });

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(toastSpy).toHaveBeenCalledTimes(1);
    const toastArg = toastSpy.mock.calls[0]?.[0] as {
      title?: string;
      description?: string;
      variant?: string;
    };
    expect(toastArg?.variant).toBe("destructive");
    expect(toastArg?.description).toBe("Producto no encontrado");
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("AC-9: while the action is pending, the 'Eliminar' button shows Loader2 + 'Eliminando…' and is disabled", async () => {
    let resolveAction: ((v: ActionResult<void>) => void) | null = null;
    const action = vi.fn(
      () =>
        new Promise<ActionResult<void>>((res) => {
          resolveAction = res;
        }),
    );

    const user = userEvent.setup();
    render(
      <DeleteProductButton
        productId="p-1"
        productName="Mouse"
        productSku="MS-01"
        movementCount={0}
        deleteProductAction={action}
        onDeleted={refreshSpy}
      />,
    );

    await user.click(screen.getByTestId("delete-product-trigger-p-1"));
    await screen.findByRole("dialog");

    const submit = screen.getByTestId("delete-product-submit");
    fireEvent.click(submit);

    await waitFor(() => {
      expect(submit).toBeDisabled();
      expect(submit).toHaveTextContent(/Eliminando…/);
      // The loading state includes a Loader2 spinner (animate-spin class).
      expect(submit.querySelector(".animate-spin")).not.toBeNull();
    });

    await act(async () => {
      resolveAction?.(makeOk());
    });
  });
});
