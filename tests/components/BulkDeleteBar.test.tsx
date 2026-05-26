/**
 * T15 — Tests for BulkDeleteBar (AC-2, AC-3, AC-5, AC-7).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BulkDeleteBar } from "@/components/products/BulkDeleteBar";
import type { ActionResult } from "@interfaces/actions/actionHelpers";
import type { DeleteProductsBulkResultDTO } from "@application/dtos/ProductDTO";

const refreshSpy = vi.fn();
const toastSpy = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: refreshSpy,
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toastSpy(...args),
  useToast: () => ({ toasts: [], toast: toastSpy, dismiss: vi.fn() }),
}));

function makeOk(
  deletedCount: number,
): ActionResult<DeleteProductsBulkResultDTO> {
  return { success: true, data: { deletedCount } };
}

function makeErr(): ActionResult<DeleteProductsBulkResultDTO> {
  return {
    success: false,
    error: "Algunos productos no se encontraron y la operación fue cancelada.",
    code: "NOT_FOUND",
  };
}

beforeEach(() => {
  refreshSpy.mockReset();
  toastSpy.mockReset();
});

describe("BulkDeleteBar (T15)", () => {
  it("AC-2: renders nothing when no SKUs are selected", () => {
    const { container } = render(
      <BulkDeleteBar
        selectedSkus={[]}
        onClear={vi.fn()}
        deleteProductsBulkAction={vi.fn()}
      />,
    );
    expect(container.querySelector('[data-testid="bulk-delete-bar"]')).toBeNull();
  });

  it("AC-2: renders the floating bar with the selection count (plural)", () => {
    render(
      <BulkDeleteBar
        selectedSkus={["A", "B", "C"]}
        onClear={vi.fn()}
        deleteProductsBulkAction={vi.fn()}
      />,
    );
    expect(screen.getByTestId("bulk-delete-bar")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-selection-count").textContent).toBe(
      "3 productos seleccionados",
    );
    expect(screen.getByTestId("bulk-delete-trigger")).toBeInTheDocument();
  });

  it("AC-2: singular wording when exactly 1 SKU is selected", () => {
    render(
      <BulkDeleteBar
        selectedSkus={["A"]}
        onClear={vi.fn()}
        deleteProductsBulkAction={vi.fn()}
      />,
    );
    expect(screen.getByTestId("bulk-selection-count").textContent).toBe(
      "1 producto seleccionado",
    );
  });

  it("AC-3: clicking Eliminar opens the confirmation Dialog with the count", async () => {
    const user = userEvent.setup();
    render(
      <BulkDeleteBar
        selectedSkus={["A", "B"]}
        onClear={vi.fn()}
        deleteProductsBulkAction={vi.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByTestId("bulk-delete-trigger"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Eliminar productos");
    expect(screen.getByTestId("bulk-delete-message").textContent).toBe(
      "¿Eliminar 2 productos? Esta acción no se puede deshacer.",
    );
    expect(screen.getByTestId("bulk-delete-cancel")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-delete-submit")).toBeInTheDocument();
  });

  it("AC-3: Cancelar closes the dialog without calling the action", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(
      <BulkDeleteBar
        selectedSkus={["A"]}
        onClear={vi.fn()}
        deleteProductsBulkAction={action}
      />,
    );

    await user.click(screen.getByTestId("bulk-delete-trigger"));
    await screen.findByRole("dialog");
    await user.click(screen.getByTestId("bulk-delete-cancel"));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(action).not.toHaveBeenCalled();
  });

  it("AC-4 + AC-5: Confirmar calls the action with the SKUs, clears selection, refreshes, and toasts success", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => makeOk(2));
    const onClear = vi.fn();
    render(
      <BulkDeleteBar
        selectedSkus={["A", "B"]}
        onClear={onClear}
        deleteProductsBulkAction={action}
      />,
    );

    await user.click(screen.getByTestId("bulk-delete-trigger"));
    await screen.findByRole("dialog");
    await user.click(screen.getByTestId("bulk-delete-submit"));

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1);
    });
    expect(action).toHaveBeenCalledWith({ skus: ["A", "B"] });
    await waitFor(() => {
      expect(onClear).toHaveBeenCalled();
      expect(refreshSpy).toHaveBeenCalled();
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Productos eliminados" }),
      );
    });
  });

  it("AC-4: surfaces destructive toast on action failure and does NOT clear selection", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => makeErr());
    const onClear = vi.fn();
    render(
      <BulkDeleteBar
        selectedSkus={["A"]}
        onClear={onClear}
        deleteProductsBulkAction={action}
      />,
    );

    await user.click(screen.getByTestId("bulk-delete-trigger"));
    await screen.findByRole("dialog");
    await user.click(screen.getByTestId("bulk-delete-submit"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive" }),
      );
    });
    expect(onClear).not.toHaveBeenCalled();
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("AC-7: Confirmar shows a loading state while the action is pending", async () => {
    const user = userEvent.setup();
    let resolve!: (v: ActionResult<DeleteProductsBulkResultDTO>) => void;
    const pending = new Promise<ActionResult<DeleteProductsBulkResultDTO>>(
      (r) => {
        resolve = r;
      },
    );
    const action = vi.fn(() => pending);

    render(
      <BulkDeleteBar
        selectedSkus={["A", "B"]}
        onClear={vi.fn()}
        deleteProductsBulkAction={action}
      />,
    );

    await user.click(screen.getByTestId("bulk-delete-trigger"));
    await screen.findByRole("dialog");
    await user.click(screen.getByTestId("bulk-delete-submit"));

    await waitFor(() => {
      const submit = screen.getByTestId(
        "bulk-delete-submit",
      ) as HTMLButtonElement;
      expect(submit.disabled).toBe(true);
      expect(submit.textContent).toContain("Eliminando");
      const cancel = screen.getByTestId(
        "bulk-delete-cancel",
      ) as HTMLButtonElement;
      expect(cancel.disabled).toBe(true);
    });

    resolve(makeOk(2));
  });
});
