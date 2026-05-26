import type { ProductDTO } from "@application/dtos/ProductDTO";

export const CSV_HEADER = [
  "SKU",
  "Nombre",
  "Categoría",
  "Stock",
  "Precio unitario",
  "Valor total",
] as const;

export const CSV_BOM = "﻿";

export interface ExportRowInput {
  product: ProductDTO;
  stock: number;
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

export function buildProductsCsv(
  products: ProductDTO[],
  stockByProductId: Record<string, number> = {},
): string {
  const headerLine = CSV_HEADER.map(escapeCsvCell).join(",");
  const rowLines = products.map((p) => {
    const stock = stockByProductId[p.id] ?? 0;
    const total = stock * p.price;
    return [
      escapeCsvCell(p.sku),
      escapeCsvCell(p.name),
      escapeCsvCell(p.categoryName ?? ""),
      escapeCsvCell(stock),
      escapeCsvCell(formatPrice(p.price)),
      escapeCsvCell(formatPrice(total)),
    ].join(",");
  });
  return CSV_BOM + [headerLine, ...rowLines].join("\r\n");
}

export function csvFilenameFor(date: Date = new Date()): string {
  const yyyy = date.getFullYear().toString().padStart(4, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  return `stock-manager-productos-${yyyy}-${mm}-${dd}.csv`;
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
