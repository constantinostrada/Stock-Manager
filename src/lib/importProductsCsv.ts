/**
 * Pure CSV utilities for the /products import.
 *
 * Parses an RFC 4180 CSV (quoted fields, escaped quotes, CRLF or LF line
 * endings, optional UTF-8 BOM) into raw string rows keyed by the catalogue
 * fields. Header names are matched accent- and case-insensitively, accepting
 * both the Spanish headers produced by the export ("Nombre", "SKU", "Precio",
 * "Categoría", "Proveedor", "Stock", "Stock mínimo") and English equivalents.
 *
 * Parsing only — no validation beyond "the required columns exist". Semantic
 * validation (SKU format, duplicates, unknown categories…) belongs to the
 * application layer (ImportProductsUseCase), which also gets to re-validate
 * server-side before anything is written.
 */

export interface ParsedProductCsvRow {
  /** 1-based line number in the file (header is row 1). For error display. */
  rowNumber: number;
  name: string;
  sku: string;
  price: string;
  categoryName: string;
  supplierName: string;
  stock: string;
  minStock: string;
}

export type ParseProductsCsvResult =
  | { ok: true; rows: ParsedProductCsvRow[] }
  | { ok: false; error: string };

type ImportField = Exclude<keyof ParsedProductCsvRow, "rowNumber">;

/** Lowercased, de-accented header → catalogue field. Unknown headers are ignored. */
const HEADER_TO_FIELD: Record<string, ImportField> = {
  nombre: "name",
  name: "name",
  sku: "sku",
  precio: "price",
  price: "price",
  categoria: "categoryName",
  category: "categoryName",
  proveedor: "supplierName",
  supplier: "supplierName",
  stock: "stock",
  "current stock": "stock",
  "stock minimo": "minStock",
  "min stock": "minStock",
  minstock: "minStock",
};

const REQUIRED_FIELDS: ImportField[] = ["name", "sku", "price"];

function normalizeHeader(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Minimal RFC 4180 parser. Returns one string[] per record; empty records
 * (blank lines) are dropped. Never throws — a lone quote is treated literally.
 */
function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let inQuotes = false;

  function endCell() {
    record.push(cell);
    cell = "";
  }
  function endRecord() {
    endCell();
    // Drop records that are entirely empty (e.g. trailing newline).
    if (record.some((c) => c.trim().length > 0)) records.push(record);
    record = [];
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell.length === 0) {
      inQuotes = true;
    } else if (ch === ",") {
      endCell();
    } else if (ch === "\n") {
      endRecord();
    } else if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      endRecord();
    } else {
      cell += ch;
    }
  }
  endRecord();
  return records;
}

export function parseProductsCsv(text: string): ParseProductsCsvResult {
  // Strip the UTF-8 BOM the export prepends for Excel.
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const records = parseCsvRecords(clean);

  if (records.length === 0) {
    return { ok: false, error: "El archivo está vacío." };
  }

  const headerRecord = records[0]!;
  const fieldByColumn = new Map<number, ImportField>();
  for (let col = 0; col < headerRecord.length; col++) {
    const field = HEADER_TO_FIELD[normalizeHeader(headerRecord[col]!)];
    if (field !== undefined && ![...fieldByColumn.values()].includes(field)) {
      fieldByColumn.set(col, field);
    }
  }

  const mappedFields = [...fieldByColumn.values()];
  const missing = REQUIRED_FIELDS.filter((f) => !mappedFields.includes(f));
  if (missing.length > 0) {
    return {
      ok: false,
      error:
        "El archivo debe incluir las columnas Nombre, SKU y Precio en la primera fila.",
    };
  }

  if (records.length === 1) {
    return { ok: false, error: "El archivo no contiene filas para importar." };
  }

  const rows: ParsedProductCsvRow[] = records.slice(1).map((record, idx) => {
    const row: ParsedProductCsvRow = {
      rowNumber: idx + 2, // +1 for 1-based, +1 for the header line
      name: "",
      sku: "",
      price: "",
      categoryName: "",
      supplierName: "",
      stock: "",
      minStock: "",
    };
    for (const [col, field] of fieldByColumn) {
      row[field] = (record[col] ?? "").trim();
    }
    return row;
  });

  return { ok: true, rows };
}
