/**
 * AC-5: Página /movements con tabla cronológica DESC:
 *       Fecha/hora, Producto (nombre + SKU), Tipo (badge verde ENTRADA / rojo SALIDA),
 *       Cantidad, Razón.
 *
 * We test the presentation component the page uses. The chronological-DESC
 * guarantee comes from the use case (verified in registerMovementAction tests
 * + integration); here we verify the table preserves the order it receives
 * AND renders the columns / Spanish badges the AC requires.
 */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MovementsHistoryTable } from "@/components/stock/MovementsHistoryTable";
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

describe("MovementsHistoryTable (AC-5)", () => {
  it("renders the 5 columns required by the AC: Fecha/hora · Producto · Tipo · Cantidad · Razón", () => {
    render(<MovementsHistoryTable movements={[]} />);
    // Empty-state branch should not render the table.
    expect(screen.queryByTestId("movements-table")).toBeNull();

    render(
      <MovementsHistoryTable
        movements={[
          makeMovement("m1", "p1", "Mouse", "IN", 5, "Compra", "2026-05-25T10:00:00Z"),
        ]}
      />,
    );
    const headers = screen
      .getAllByRole("columnheader")
      .map((h) => h.textContent?.trim());
    expect(headers).toEqual([
      "Fecha / hora",
      "Producto",
      "Tipo",
      "Cantidad",
      "Razón",
    ]);
  });

  it("preserves the chronological DESC order it receives from the use case", () => {
    // Caller (use case) sorts DESC by createdAt — the table must not re-order.
    const movements = [
      makeMovement("m3", "p1", "Mouse", "IN", 5, "Compra", "2026-05-25T12:00:00Z"),
      makeMovement("m2", "p1", "Mouse", "OUT", 2, "Venta", "2026-05-25T11:00:00Z"),
      makeMovement("m1", "p1", "Mouse", "IN", 10, "Compra", "2026-05-25T10:00:00Z"),
    ];
    render(
      <MovementsHistoryTable
        movements={movements}
        productSkuById={{ p1: "MS-01" }}
      />,
    );
    const rows = screen.getAllByTestId("movement-row");
    expect(rows).toHaveLength(3);
    expect(rows[0]!.getAttribute("data-tipo")).toBe("ENTRADA");
    expect(rows[1]!.getAttribute("data-tipo")).toBe("SALIDA");
    expect(rows[2]!.getAttribute("data-tipo")).toBe("ENTRADA");
  });

  it("renders the Producto cell with both name AND SKU", () => {
    render(
      <MovementsHistoryTable
        movements={[
          makeMovement("m1", "p1", "Mouse óptico", "IN", 5, "Compra", "2026-05-25T10:00:00Z"),
        ]}
        productSkuById={{ p1: "MS-01" }}
      />,
    );
    const row = screen.getByTestId("movement-row");
    expect(within(row).getByText("Mouse óptico")).toBeInTheDocument();
    expect(within(row).getByText("MS-01")).toBeInTheDocument();
    // SKU is rendered as <code> for the monospace badge.
    expect(within(row).getByText("MS-01").tagName.toLowerCase()).toBe("code");
  });

  it("renders ENTRADA badges in green and SALIDA badges in red (destructive)", () => {
    render(
      <MovementsHistoryTable
        movements={[
          makeMovement("m1", "p1", "Mouse", "IN", 5, "Compra", "2026-05-25T10:00:00Z"),
          makeMovement("m2", "p1", "Mouse", "OUT", 2, "Venta", "2026-05-25T09:00:00Z"),
        ]}
      />,
    );
    const badges = screen.getAllByTestId("tipo-badge");
    expect(badges).toHaveLength(2);

    const [entrada, salida] = badges;
    expect(entrada!.textContent).toBe("ENTRADA");
    expect(salida!.textContent).toBe("SALIDA");

    // Green ENTRADA: emerald background utility classes.
    expect(entrada!.className).toMatch(/bg-emerald-600/);
    // Red SALIDA: shadcn destructive variant.
    expect(salida!.className).toMatch(/bg-destructive/);
  });
});
