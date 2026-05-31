/**
 * Pure CSV parser for the /products import (T29).
 *
 * Accepts a CSV string with the canonical header
 *   sku, name, description, price, categoryName, supplierName, quantity, minQuantity
 * and produces an array of raw row objects keyed by column name. The parser is
 * RFC 4180-ish: it understands double-quoted cells with embedded commas and
 * escaped double quotes (`""`). It is tolerant of a UTF-8 BOM and both `\n`
 * and `\r\n` line endings.
 *
 * The parser does NO domain validation — it just turns CSV bytes into rows.
 * The use case (`ImportProductsCsvUseCase`) is responsible for validating that
 * the price is numeric, the SKU is well-formed, etc.
 */

export const IMPORT_HEADER = [
  "sku",
  "name",
  "description",
  "price",
  "categoryName",
  "supplierName",
  "quantity",
  "minQuantity",
] as const;

export type ImportHeaderColumn = (typeof IMPORT_HEADER)[number];

export type ImportCsvRawRow = Record<ImportHeaderColumn, string>;

export interface ParseProductsCsvResult {
  ok: boolean;
  /** When `ok=false`, a human-readable description of the file-level error. */
  error?: string;
  /** Parsed rows in the order they appear in the file (post-header). */
  rows: ImportCsvRawRow[];
}

const BOM = "﻿";

function stripBom(text: string): string {
  return text.startsWith(BOM) ? text.slice(BOM.length) : text;
}

/**
 * Splits a single CSV line into cells, honouring double-quoted cells with
 * embedded commas and escaped quotes (`""`).
 *
 * Tolerant of inputs that don't strictly comply with RFC 4180 — a stray
 * unbalanced quote is treated as literal text rather than aborting the parse.
 */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      cells.push(cell);
      cell = "";
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

/**
 * Splits the raw CSV text into logical lines (LF or CRLF). Empty lines are
 * dropped so trailing newlines don't materialise phantom rows. Lines made up
 * entirely of empty cells (e.g. `,,,,`) are also dropped.
 */
function splitLines(text: string): string[] {
  const normalised = text.replace(/\r\n?/g, "\n");
  return normalised.split("\n").filter((line) => {
    if (line.length === 0) return false;
    // Drop lines that have no content at all (e.g. ",,,,,,,").
    const cells = splitCsvLine(line);
    return cells.some((c) => c.length > 0);
  });
}

/**
 * Compares the parsed header cells against the canonical IMPORT_HEADER.
 * Case-sensitive, order-sensitive — keeps the contract simple.
 */
function headerMatches(headerCells: string[]): boolean {
  if (headerCells.length !== IMPORT_HEADER.length) return false;
  for (let i = 0; i < IMPORT_HEADER.length; i++) {
    if (headerCells[i] !== IMPORT_HEADER[i]) return false;
  }
  return true;
}

export function parseProductsCsv(csvText: string): ParseProductsCsvResult {
  const text = stripBom(csvText);
  const lines = splitLines(text);

  if (lines.length === 0) {
    return {
      ok: false,
      error: "El archivo CSV está vacío.",
      rows: [],
    };
  }

  const headerCells = splitCsvLine(lines[0]!);
  if (!headerMatches(headerCells)) {
    return {
      ok: false,
      error: `El encabezado del CSV no coincide. Se esperaba: ${IMPORT_HEADER.join(", ")}.`,
      rows: [],
    };
  }

  const rows: ImportCsvRawRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    const row = {} as ImportCsvRawRow;
    for (let c = 0; c < IMPORT_HEADER.length; c++) {
      row[IMPORT_HEADER[c]!] = cells[c] ?? "";
    }
    rows.push(row);
  }

  return { ok: true, rows };
}
