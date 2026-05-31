/**
 * ImportProductsCsvUseCase
 *
 * Parses a CSV of products and either previews the result (dry-run) or applies
 * it to the database (commit). Upserts products by SKU; auto-creates missing
 * categories and suppliers by name; logs a StockMovement with type=ADJUSTMENT
 * whenever an existing product's stock quantity changes.
 *
 * LAYER: application
 */

import { Product } from "@domain/entities/Product";
import { Category } from "@domain/entities/Category";
import { Supplier } from "@domain/entities/Supplier";
import { StockLevel } from "@domain/entities/StockLevel";
import { StockMovement } from "@domain/entities/StockMovement";
import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";
import { MovementType } from "@domain/value-objects/MovementType";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import {
  parseProductsCsv,
  IMPORT_HEADER,
  type ImportCsvRawRow,
} from "@/lib/importProductsCsv";

export type ImportMode = "dry-run" | "commit";
export type ImportRowAction = "create" | "update";

export interface ImportProductsCsvInputDTO {
  csvText: string;
  mode: ImportMode;
}

export interface ImportValidRowDTO {
  rowNumber: number;
  action: ImportRowAction;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  categoryName: string | null;
  supplierName: string | null;
  quantity: number;
  minQuantity: number;
}

export interface ImportInvalidRowDTO {
  rowNumber: number;
  errors: string[];
  raw: ImportCsvRawRow;
}

export interface ImportSummaryDTO {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  /** Populated only when mode === "commit". */
  createdCount: number;
  /** Populated only when mode === "commit". */
  updatedCount: number;
  /** Populated only when mode === "commit" — number of ADJUSTMENT movements. */
  movementsLogged: number;
}

export interface ImportProductsCsvResultDTO {
  mode: ImportMode;
  fileError: string | null;
  valid: ImportValidRowDTO[];
  invalid: ImportInvalidRowDTO[];
  summary: ImportSummaryDTO;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

interface ValidatedRow {
  rowNumber: number;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  categoryName: string | null;
  supplierName: string | null;
  quantity: number;
  minQuantity: number;
}

export class ImportProductsCsvUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: ICategoryRepository,
    private readonly supplierRepository: ISupplierRepository,
    private readonly stockRepository: IStockRepository,
  ) {}

  async execute(
    dto: ImportProductsCsvInputDTO,
  ): Promise<ImportProductsCsvResultDTO> {
    const parsed = parseProductsCsv(dto.csvText);
    if (!parsed.ok) {
      return {
        mode: dto.mode,
        fileError: parsed.error ?? "El archivo CSV no se pudo parsear.",
        valid: [],
        invalid: [],
        summary: {
          totalRows: 0,
          validCount: 0,
          invalidCount: 0,
          createdCount: 0,
          updatedCount: 0,
          movementsLogged: 0,
        },
      };
    }

    // Pass 1 — per-row local validation and dedup-within-file.
    const seenSkus = new Map<string, number>(); // normalised SKU → first rowNumber
    const validated: ValidatedRow[] = [];
    const invalid: ImportInvalidRowDTO[] = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      const raw = parsed.rows[i]!;
      const rowNumber = i + 2; // header is row 1, data starts at row 2
      const errors: string[] = [];

      const skuRaw = raw.sku.trim();
      let normalisedSku: string | null = null;
      if (skuRaw.length === 0) {
        errors.push("El SKU es requerido.");
      } else {
        try {
          normalisedSku = SKU.create(skuRaw).value;
        } catch {
          errors.push(`SKU inválido: "${skuRaw}".`);
        }
      }

      const name = raw.name.trim();
      if (name.length === 0) {
        errors.push("El nombre es requerido.");
      } else if (name.length > 200) {
        errors.push("El nombre debe tener como máximo 200 caracteres.");
      }

      const description =
        raw.description.trim().length === 0 ? null : raw.description.trim();

      const priceRaw = raw.price.trim();
      let price = NaN;
      if (priceRaw.length === 0) {
        errors.push("El precio es requerido.");
      } else {
        price = Number(priceRaw);
        if (!Number.isFinite(price)) {
          errors.push(`El precio no es numérico: "${priceRaw}".`);
        } else if (price < 0) {
          errors.push("El precio no puede ser negativo.");
        }
      }

      const categoryName =
        raw.categoryName.trim().length === 0 ? null : raw.categoryName.trim();
      const supplierName =
        raw.supplierName.trim().length === 0 ? null : raw.supplierName.trim();

      const quantityRaw = raw.quantity.trim();
      let quantity = 0;
      if (quantityRaw.length === 0) {
        errors.push("La cantidad es requerida.");
      } else {
        const parsedQty = Number(quantityRaw);
        if (!Number.isInteger(parsedQty)) {
          errors.push(`La cantidad debe ser un entero: "${quantityRaw}".`);
        } else if (parsedQty < 0) {
          errors.push("La cantidad no puede ser negativa.");
        } else {
          quantity = parsedQty;
        }
      }

      const minQtyRaw = raw.minQuantity.trim();
      let minQuantity = 0;
      if (minQtyRaw.length === 0) {
        errors.push("La cantidad mínima es requerida.");
      } else {
        const parsedMin = Number(minQtyRaw);
        if (!Number.isInteger(parsedMin)) {
          errors.push(`La cantidad mínima debe ser un entero: "${minQtyRaw}".`);
        } else if (parsedMin < 0) {
          errors.push("La cantidad mínima no puede ser negativa.");
        } else {
          minQuantity = parsedMin;
        }
      }

      // Duplicate SKU inside the CSV — only flag the second + occurrence.
      if (normalisedSku !== null) {
        if (seenSkus.has(normalisedSku)) {
          errors.push(
            `SKU duplicado en el archivo (también aparece en la fila ${seenSkus.get(normalisedSku)}).`,
          );
        } else {
          seenSkus.set(normalisedSku, rowNumber);
        }
      }

      if (errors.length > 0) {
        invalid.push({ rowNumber, errors, raw });
        continue;
      }

      validated.push({
        rowNumber,
        sku: normalisedSku!,
        name,
        description,
        price,
        currency: "USD",
        categoryName,
        supplierName,
        quantity,
        minQuantity,
      });
    }

    // Pass 2 — per-row DB lookups to classify create vs update.
    const validResults: ImportValidRowDTO[] = [];
    // Cache the existing Product entity for commit phase so we don't refetch.
    const existingProductBySku = new Map<string, Product | null>();
    for (const row of validated) {
      const existing = await this.productRepository.findBySku(row.sku);
      existingProductBySku.set(row.sku, existing);
      validResults.push({
        rowNumber: row.rowNumber,
        action: existing ? "update" : "create",
        sku: row.sku,
        name: row.name,
        description: row.description,
        price: row.price,
        categoryName: row.categoryName,
        supplierName: row.supplierName,
        quantity: row.quantity,
        minQuantity: row.minQuantity,
      });
    }

    const summary: ImportSummaryDTO = {
      totalRows: parsed.rows.length,
      validCount: validated.length,
      invalidCount: invalid.length,
      createdCount: 0,
      updatedCount: 0,
      movementsLogged: 0,
    };

    if (dto.mode === "dry-run") {
      return {
        mode: dto.mode,
        fileError: null,
        valid: validResults,
        invalid,
        summary,
      };
    }

    // ── commit phase ────────────────────────────────────────────────────────
    const categoryCache = new Map<string, Category>(); // by trimmed name
    const supplierCache = new Map<string, Supplier>();

    const resolveCategory = async (
      name: string | null,
    ): Promise<Category | null> => {
      if (name === null) return null;
      const cached = categoryCache.get(name);
      if (cached) return cached;
      const existing = await this.categoryRepository.findByName(name);
      if (existing) {
        categoryCache.set(name, existing);
        return existing;
      }
      const now = new Date();
      const created = Category.create({
        id: generateId(),
        name,
        createdAt: now,
        updatedAt: now,
      });
      const saved = await this.categoryRepository.save(created);
      categoryCache.set(name, saved);
      return saved;
    };

    const resolveSupplier = async (
      name: string | null,
    ): Promise<Supplier | null> => {
      if (name === null) return null;
      const cached = supplierCache.get(name);
      if (cached) return cached;
      const existing = await this.supplierRepository.findByName(name);
      if (existing) {
        supplierCache.set(name, existing);
        return existing;
      }
      const now = new Date();
      const created = Supplier.create({
        id: generateId(),
        name,
        email: null,
        phone: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
      });
      const saved = await this.supplierRepository.save(created);
      supplierCache.set(name, saved);
      return saved;
    };

    for (const row of validated) {
      const category = await resolveCategory(row.categoryName);
      const supplier = await resolveSupplier(row.supplierName);
      const existing = existingProductBySku.get(row.sku) ?? null;
      const now = new Date();

      if (existing === null) {
        // CREATE path — new product + seed stock level. No ADJUSTMENT movement
        // (matches CreateProductUseCase: the initial level is the genesis,
        // not a "change of quantity").
        const created = Product.create({
          id: generateId(),
          name: row.name,
          description: row.description,
          sku: SKU.create(row.sku),
          price: Money.create(row.price, row.currency),
          categoryId: category?.id ?? null,
          supplierId: supplier?.id ?? null,
          createdAt: now,
          updatedAt: now,
        });
        await this.productRepository.save(created);
        const level = StockLevel.create({
          id: generateId(),
          productId: created.id,
          quantity: row.quantity,
          minQuantity: row.minQuantity,
          updatedAt: now,
        });
        await this.stockRepository.saveStockLevel(level);
        summary.createdCount++;
      } else {
        // UPDATE path — patch product, then reconcile stock level. If the
        // new quantity differs from the current stock level, record an
        // ADJUSTMENT movement (atomic via applyMovement).
        const updated = existing.update({
          name: row.name,
          description: row.description,
          price: Money.create(row.price, row.currency),
          categoryId: category?.id ?? null,
          supplierId: supplier?.id ?? null,
        });
        await this.productRepository.update(updated);

        const currentLevel = await this.stockRepository
          .findStockLevelByProductId(existing.id);

        if (currentLevel === null) {
          // No existing stock level (edge case): just create one. No movement.
          const level = StockLevel.create({
            id: generateId(),
            productId: existing.id,
            quantity: row.quantity,
            minQuantity: row.minQuantity,
            updatedAt: now,
          });
          await this.stockRepository.saveStockLevel(level);
        } else if (currentLevel.quantity !== row.quantity) {
          // Quantity changed — record an ADJUSTMENT movement + update level
          // atomically. StockMovement.quantity is the new absolute value
          // (matches the AdjustStockUseCase convention).
          if (row.quantity > 0) {
            const newLevel = StockLevel.create({
              id: currentLevel.id,
              productId: currentLevel.productId,
              quantity: row.quantity,
              minQuantity: row.minQuantity,
              updatedAt: now,
            });
            const movement = StockMovement.create({
              id: generateId(),
              productId: existing.id,
              type: MovementType.ADJUSTMENT,
              quantity: row.quantity,
              reason: "Importación CSV",
              reference: null,
              createdAt: now,
            });
            await this.stockRepository.applyMovement(newLevel, movement);
            summary.movementsLogged++;
          } else {
            // newQuantity === 0 — StockMovement.create rejects quantity 0, so
            // we save the level directly. The audit trail loses this single
            // event, which is preferable to bending the domain invariant.
            const newLevel = StockLevel.create({
              id: currentLevel.id,
              productId: currentLevel.productId,
              quantity: 0,
              minQuantity: row.minQuantity,
              updatedAt: now,
            });
            await this.stockRepository.saveStockLevel(newLevel);
          }
        } else if (currentLevel.minQuantity !== row.minQuantity) {
          // Same quantity, only minQuantity changed → no movement needed.
          const newLevel = StockLevel.create({
            id: currentLevel.id,
            productId: currentLevel.productId,
            quantity: currentLevel.quantity,
            minQuantity: row.minQuantity,
            updatedAt: now,
          });
          await this.stockRepository.saveStockLevel(newLevel);
        }

        summary.updatedCount++;
      }
    }

    return {
      mode: dto.mode,
      fileError: null,
      valid: validResults,
      invalid,
      summary,
    };
  }
}

export { IMPORT_HEADER };
