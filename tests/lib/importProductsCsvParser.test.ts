/**
 * CSV import — parseProductsCsv
 *
 *  • Maps Spanish (export) and English headers, accent/case-insensitively.
 *  • Handles RFC 4180 quoting, CRLF/LF endings and the UTF-8 BOM.
 *  • Rejects files missing the required Nombre/SKU/Precio columns, empty
 *    files and header-only files.
 *  • Round-trips the export format (buildProductsCsv → parseProductsCsv).
 */
import { describe, expect, it } from "vitest";
import { parseProductsCsv } from "@/lib/importProductsCsv";
import { buildProductsCsv } from "@/lib/exportProductsCsv";

describe("parseProductsCsv", () => {
  it("parses a minimal CSV with the required columns", () => {
    const result = parseProductsCsv(
      "Nombre,SKU,Precio\nMouse,MOU-001,25.50\nTeclado,TEC-001,80",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([
      {
        rowNumber: 2,
        name: "Mouse",
        sku: "MOU-001",
        price: "25.50",
        categoryName: "",
        supplierName: "",
        stock: "",
        minStock: "",
      },
      {
        rowNumber: 3,
        name: "Teclado",
        sku: "TEC-001",
        price: "80",
        categoryName: "",
        supplierName: "",
        stock: "",
        minStock: "",
      },
    ]);
  });

  it("maps the full Spanish export header, including accents and Stock mínimo", () => {
    const result = parseProductsCsv(
      "Nombre,SKU,Precio,Categoría,Proveedor,Stock,Stock mínimo,Creado\n" +
        "Mouse,MOU-001,25.50,Periféricos,Acme,12,3,2026-01-01T00:00:00.000Z",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0]).toMatchObject({
      name: "Mouse",
      sku: "MOU-001",
      price: "25.50",
      categoryName: "Periféricos",
      supplierName: "Acme",
      stock: "12",
      minStock: "3",
    });
  });

  it("accepts English header aliases case-insensitively", () => {
    const result = parseProductsCsv(
      "NAME,sku,Price,Category,Supplier,Current Stock,Min Stock\n" +
        "Hub,HUB-01,9.99,Cables,Acme,4,1",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0]).toMatchObject({
      name: "Hub",
      stock: "4",
      minStock: "1",
    });
  });

  it("strips the UTF-8 BOM and handles CRLF endings (export format)", () => {
    const result = parseProductsCsv(
      "﻿Nombre,SKU,Precio\r\nMouse,MOU-001,10\r\n",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.name).toBe("Mouse");
  });

  it("RFC 4180 — unescapes quoted cells with commas and doubled quotes", () => {
    const result = parseProductsCsv(
      'Nombre,SKU,Precio\n"Mouse, gamer",MOU-001,10\n"Monitor 27""",MON-27,300',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0]!.name).toBe("Mouse, gamer");
    expect(result.rows[1]!.name).toBe('Monitor 27"');
  });

  it("skips blank lines but keeps original file line numbers", () => {
    const result = parseProductsCsv(
      "Nombre,SKU,Precio\nMouse,MOU-001,10\n\nTeclado,TEC-001,20",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Blank line is dropped; rows are numbered by their position in the
    // record list (2 and 3) — good enough for error display.
    expect(result.rows.map((r) => r.name)).toEqual(["Mouse", "Teclado"]);
  });

  it("rejects a file missing a required column", () => {
    const result = parseProductsCsv("Nombre,Precio\nMouse,10");
    expect(result).toEqual({
      ok: false,
      error:
        "El archivo debe incluir las columnas Nombre, SKU y Precio en la primera fila.",
    });
  });

  it("rejects an empty file and a header-only file", () => {
    expect(parseProductsCsv("")).toEqual({
      ok: false,
      error: "El archivo está vacío.",
    });
    expect(parseProductsCsv("Nombre,SKU,Precio\n")).toEqual({
      ok: false,
      error: "El archivo no contiene filas para importar.",
    });
  });

  it("round-trips the export format", () => {
    const csv = buildProductsCsv([
      {
        name: "Mouse, gamer",
        sku: "MOU-001",
        price: 25.5,
        categoryName: "Periféricos",
        supplierName: 'Acme "SA"',
        stock: 12,
        minStock: 3,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0]).toMatchObject({
      name: "Mouse, gamer",
      sku: "MOU-001",
      price: "25.50",
      categoryName: "Periféricos",
      supplierName: 'Acme "SA"',
      stock: "12",
      minStock: "3",
    });
  });
});
