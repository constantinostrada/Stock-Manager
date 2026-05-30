/**
 * Pure CSV utilities for the /products export (T28).
 *
 * Builds an RFC 4180-compliant CSV with a UTF-8 BOM so Excel opens it with
 * accents intact. Filename uses local time (with HHmm) so concurrent exports
 * don't clobber each other. The DOM-touching `triggerCsvDownload` is kept in
 * this file because it's pure code that only runs in client components.
 */

export const CSV_HEADER = [
  "Nombre",
  "Precio",
  "Stock",
  "Proveedor",
  "Creado",
] as const;

export const CSV_BOM = "﻿";

export interface ExportProductCsvRow {
  name: string;
  price: number;
  stock: number;
  supplierName: string | null;
  createdAt: string;
}

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatPrice(value: number): string {
  return value.toFixed(2);
}

export function buildProductsCsv(rows: ExportProductCsvRow[]): string {
  const headerLine = CSV_HEADER.map(escapeCsvCell).join(",");
  const rowLines = rows.map((r) =>
    [
      escapeCsvCell(r.name),
      escapeCsvCell(formatPrice(r.price)),
      escapeCsvCell(r.stock),
      escapeCsvCell(r.supplierName ?? ""),
      escapeCsvCell(r.createdAt),
    ].join(","),
  );
  return CSV_BOM + [headerLine, ...rowLines].join("\r\n");
}

export function csvFilenameFor(date: Date = new Date()): string {
  const yyyy = date.getFullYear().toString().padStart(4, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  const hh = date.getHours().toString().padStart(2, "0");
  const mi = date.getMinutes().toString().padStart(2, "0");
  return `products-${yyyy}-${mm}-${dd}-${hh}${mi}.csv`;
}

export function triggerCsvDownload(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
