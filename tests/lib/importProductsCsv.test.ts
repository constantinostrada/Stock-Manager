/**
 * T29 — CSV parser unit tests.
 *
 * Covers AC-2 (canonical header) and AC-7 (parseo válido, error de formato).
 */
import { describe, expect, it } from "vitest";
import {
  parseProductsCsv,
  IMPORT_HEADER,
} from "@/lib/importProductsCsv";

const HEADER_LINE = IMPORT_HEADER.join(",");

describe("parseProductsCsv — T29", () => {
  it("AC-2: parses a CSV with the canonical 8-column header", () => {
    const csv = [
      HEADER_LINE,
      "SKU-01,Mouse,Mouse óptico,25.50,Periféricos,Acme,10,2",
    ].join("\r\n");

    const result = parseProductsCsv(csv);

    expect(result.ok).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      sku: "SKU-01",
      name: "Mouse",
      description: "Mouse óptico",
      price: "25.50",
      categoryName: "Periféricos",
      supplierName: "Acme",
      quantity: "10",
      minQuantity: "2",
    });
  });

  it("AC-7: returns ok=false with a file-level error when the header is wrong", () => {
    const csv = "sku,nombre,price\nA,B,C";
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/encabezado/i);
    expect(result.rows).toEqual([]);
  });

  it("AC-7: returns ok=false when the file is empty", () => {
    const result = parseProductsCsv("");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/vacío/i);
  });

  it("tolerates a UTF-8 BOM at the start of the file", () => {
    const csv = "﻿" + [HEADER_LINE, "SKU-01,A,,10,,,1,0"].join("\n");
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.sku).toBe("SKU-01");
  });

  it("handles double-quoted cells with embedded commas", () => {
    const csv = [
      HEADER_LINE,
      `"SKU-01","Mouse, gamer","Pro, RGB",30.00,Per,Acme,5,1`,
    ].join("\n");

    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    expect(result.rows[0]).toEqual({
      sku: "SKU-01",
      name: "Mouse, gamer",
      description: "Pro, RGB",
      price: "30.00",
      categoryName: "Per",
      supplierName: "Acme",
      quantity: "5",
      minQuantity: "1",
    });
  });

  it("decodes escaped double quotes (\"\" → \") inside quoted cells", () => {
    const csv = [
      HEADER_LINE,
      `"SKU-01","Monitor 27""","desc",100,Per,Acme,1,0`,
    ].join("\n");

    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    expect(result.rows[0]!.name).toBe('Monitor 27"');
  });

  it("ignores blank trailing lines", () => {
    const csv = [HEADER_LINE, "SKU-01,A,,1,,,1,0", "", "", ""].join("\r\n");
    const result = parseProductsCsv(csv);
    expect(result.ok).toBe(true);
    expect(result.rows).toHaveLength(1);
  });
});
