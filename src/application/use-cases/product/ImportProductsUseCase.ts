/**
 * ImportProductsUseCase
 *
 * Bulk-creates products from rows parsed out of an uploaded CSV. Runs in two
 * modes sharing the exact same validation:
 *
 *   • dryRun: true  → validates every row and returns the per-row verdicts
 *                     (used by the import dialog's preview table).
 *   • dryRun: false → re-validates, then persists the valid rows (product +
 *                     initial stock level). Invalid rows are skipped — never
 *                     a reason to abort the rest of the batch.
 *
 * Validation per row: required/length-checked name, SKU format (domain VO),
 * positive numeric price, non-negative integer stock/minStock, SKU unique
 * within the file AND against the DB, and category/supplier resolved by name.
 *
 * LAYER: application
 */

import { Product } from "@domain/entities/Product";
import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";
import { StockLevel } from "@domain/entities/StockLevel";
import { DomainException } from "@domain/exceptions/DomainException";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import type {
  ImportProductsInputDTO,
  ImportProductRowInputDTO,
  ImportProductRowResultDTO,
  ImportProductsResultDTO,
} from "@application/dtos/ProductDTO";

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

interface ValidatedRow {
  raw: ImportProductRowInputDTO;
  name: string;
  sku: SKU;
  price: Money;
  categoryId: string | null;
  supplierId: string | null;
  stock: number;
  minStock: number;
}

/** Parses an optional non-negative integer cell ("" → 0). Null on error. */
function parseQuantity(raw: string): number | null {
  if (raw.trim().length === 0) return 0;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

export class ImportProductsUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly stockRepository: IStockRepository,
    private readonly categoryRepository: ICategoryRepository,
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(dto: ImportProductsInputDTO): Promise<ImportProductsResultDTO> {
    const [categories, suppliers] = await Promise.all([
      this.categoryRepository.findAll(),
      this.supplierRepository.findAll(),
    ]);
    const categoryByName = new Map(
      categories.map((c) => [c.name.trim().toLowerCase(), c]),
    );
    const supplierByName = new Map(
      suppliers.map((s) => [s.name.trim().toLowerCase(), s]),
    );

    const seenSkus = new Set<string>();
    const resultRows: ImportProductRowResultDTO[] = [];
    const validRows: ValidatedRow[] = [];

    for (const raw of dto.rows) {
      const errors: string[] = [];

      const name = raw.name.trim();
      if (name.length === 0) {
        errors.push("El nombre es requerido.");
      } else if (name.length > 200) {
        errors.push("El nombre debe tener como máximo 200 caracteres.");
      }

      let sku: SKU | null = null;
      try {
        sku = SKU.create(raw.sku);
      } catch (error) {
        if (!(error instanceof DomainException)) throw error;
        errors.push(
          raw.sku.trim().length === 0
            ? "El SKU es requerido."
            : "El SKU es inválido (2–10 caracteres alfanuméricos, opcionalmente separados por guiones).",
        );
      }
      if (sku) {
        if (seenSkus.has(sku.value)) {
          errors.push("SKU duplicado en el archivo.");
        } else {
          seenSkus.add(sku.value);
          if (await this.productRepository.existsBySku(sku.value)) {
            errors.push("El SKU ya existe en el catálogo.");
          }
        }
      }

      let price: Money | null = null;
      const priceRaw = raw.price.trim();
      if (priceRaw.length === 0) {
        errors.push("El precio es requerido.");
      } else {
        const amount = Number(priceRaw);
        if (!Number.isFinite(amount) || amount <= 0) {
          errors.push("El precio debe ser un número mayor a 0.");
        } else {
          price = Money.create(amount);
        }
      }

      const stock = parseQuantity(raw.stock);
      if (stock === null) {
        errors.push("El stock debe ser un número entero mayor o igual a 0.");
      }
      const minStock = parseQuantity(raw.minStock);
      if (minStock === null) {
        errors.push(
          "El stock mínimo debe ser un número entero mayor o igual a 0.",
        );
      }

      let categoryId: string | null = null;
      const categoryName = raw.categoryName.trim();
      if (categoryName.length > 0) {
        const category = categoryByName.get(categoryName.toLowerCase());
        if (category) categoryId = category.id;
        else errors.push(`La categoría "${categoryName}" no existe.`);
      }

      let supplierId: string | null = null;
      const supplierName = raw.supplierName.trim();
      if (supplierName.length > 0) {
        const supplier = supplierByName.get(supplierName.toLowerCase());
        if (supplier) supplierId = supplier.id;
        else errors.push(`El proveedor "${supplierName}" no existe.`);
      }

      const valid = errors.length === 0;
      resultRows.push({ ...raw, valid, errors });
      if (valid) {
        validRows.push({
          raw,
          name,
          sku: sku!,
          price: price!,
          categoryId,
          supplierId,
          stock: stock!,
          minStock: minStock!,
        });
      }
    }

    let createdCount = 0;
    if (!dto.dryRun) {
      for (const row of validRows) {
        const now = new Date();
        const product = Product.create({
          id: generateId(),
          name: row.name,
          description: null,
          sku: row.sku,
          price: row.price,
          categoryId: row.categoryId,
          supplierId: row.supplierId,
          createdAt: now,
          updatedAt: now,
        });
        const saved = await this.productRepository.save(product);

        const stockLevel = StockLevel.create({
          id: generateId(),
          productId: saved.id,
          quantity: row.stock,
          minQuantity: row.minStock,
          updatedAt: now,
        });
        await this.stockRepository.saveStockLevel(stockLevel);
        createdCount++;
      }
    }

    return {
      rows: resultRows,
      validCount: validRows.length,
      errorCount: resultRows.length - validRows.length,
      createdCount,
    };
  }
}
