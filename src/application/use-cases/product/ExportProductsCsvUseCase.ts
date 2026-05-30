/**
 * ExportProductsCsvUseCase
 *
 * Builds a CSV export of the /products catalogue, respecting only the URL
 * filters that affect the displayed dataset (`name` from `?q`, `sort` from
 * `?sort`). Pagination (`page`, `limit`) is intentionally NOT part of this
 * use case's input — the export covers the entire filtered resultset.
 *
 * LAYER: application
 */

import type { IProductRepository, ProductSort } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import {
  buildProductsCsv,
  csvFilenameFor,
  type ExportProductCsvRow,
} from "@/lib/exportProductsCsv";

export interface ExportProductsCsvInputDTO {
  name?: string;
  sort?: ProductSort;
}

export interface ExportProductsCsvResultDTO {
  filename: string;
  content: string;
}

export class ExportProductsCsvUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly stockRepository: IStockRepository,
    private readonly supplierRepository: ISupplierRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    dto: ExportProductsCsvInputDTO = {},
  ): Promise<ExportProductsCsvResultDTO> {
    const products = await this.productRepository.findAll({
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
    });

    const supplierIds = [
      ...new Set(
        products
          .map((p) => p.supplierId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const suppliers = await Promise.all(
      supplierIds.map((id) => this.supplierRepository.findById(id)),
    );
    const supplierNameById = new Map<string, string>();
    for (const supplier of suppliers) {
      if (supplier) supplierNameById.set(supplier.id, supplier.name);
    }

    const stockLevels = await this.stockRepository.findAllStockLevels();
    const stockByProductId = new Map<string, number>();
    for (const level of stockLevels) {
      stockByProductId.set(level.productId, level.quantity);
    }

    const rows: ExportProductCsvRow[] = products.map((p) => ({
      name: p.name,
      price: p.price.amount,
      stock: stockByProductId.get(p.id) ?? 0,
      supplierName: p.supplierId
        ? (supplierNameById.get(p.supplierId) ?? null)
        : null,
      createdAt: p.createdAt.toISOString(),
    }));

    return {
      filename: csvFilenameFor(this.now()),
      content: buildProductsCsv(rows),
    };
  }
}
