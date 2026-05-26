/**
 * PrismaStockRepository
 *
 * Concrete implementation of IStockRepository using Prisma + SQLite.
 *
 * LAYER: infrastructure
 */

import type {
  PrismaClient,
  StockLevel as PrismaStockLevel,
  StockMovement as PrismaStockMovement,
} from "@prisma/client";
import { StockLevel } from "@domain/entities/StockLevel";
import { StockMovement } from "@domain/entities/StockMovement";
import { MovementType } from "@domain/value-objects/MovementType";
import type {
  IStockRepository,
  StockMovementFilters,
} from "@domain/repositories/IStockRepository";

export class PrismaStockRepository implements IStockRepository {
  constructor(private readonly db: PrismaClient) {}

  // ─── Stock Levels ─────────────────────────────────────────────────────────

  async findStockLevelByProductId(productId: string): Promise<StockLevel | null> {
    const row = await this.db.stockLevel.findUnique({ where: { productId } });
    return row ? this.toStockLevelDomain(row) : null;
  }

  async findAllStockLevels(): Promise<StockLevel[]> {
    const rows = await this.db.stockLevel.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((r) => this.toStockLevelDomain(r));
  }

  async findLowStockLevels(): Promise<StockLevel[]> {
    // SQLite doesn't support column comparisons in WHERE via Prisma directly,
    // so we fetch all and filter in memory (acceptable for small datasets).
    const rows = await this.db.stockLevel.findMany();
    return rows
      .filter((r) => r.quantity <= r.minQuantity)
      .map((r) => this.toStockLevelDomain(r));
  }

  async saveStockLevel(stockLevel: StockLevel): Promise<StockLevel> {
    const row = await this.db.stockLevel.upsert({
      where: { productId: stockLevel.productId },
      create: {
        id: stockLevel.id,
        productId: stockLevel.productId,
        quantity: stockLevel.quantity,
        minQuantity: stockLevel.minQuantity,
        updatedAt: stockLevel.updatedAt,
      },
      update: {
        quantity: stockLevel.quantity,
        minQuantity: stockLevel.minQuantity,
        updatedAt: stockLevel.updatedAt,
      },
    });
    return this.toStockLevelDomain(row);
  }

  // ─── Stock Movements ──────────────────────────────────────────────────────

  async findMovementById(id: string): Promise<StockMovement | null> {
    const row = await this.db.stockMovement.findUnique({ where: { id } });
    return row ? this.toMovementDomain(row) : null;
  }

  async findMovements(filters: StockMovementFilters = {}): Promise<StockMovement[]> {
    const rows = await this.db.stockMovement.findMany({
      where: {
        ...(filters.productId && { productId: filters.productId }),
        ...(filters.type && { type: filters.type }),
        ...(filters.fromDate || filters.toDate
          ? {
              createdAt: {
                ...(filters.fromDate && { gte: filters.fromDate }),
                ...(filters.toDate && { lte: filters.toDate }),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toMovementDomain(r));
  }

  async saveMovement(movement: StockMovement): Promise<StockMovement> {
    const row = await this.db.stockMovement.create({
      data: {
        id: movement.id,
        productId: movement.productId,
        type: movement.type.value,
        quantity: movement.quantity,
        reason: movement.reason,
        reference: movement.reference,
        createdAt: movement.createdAt,
      },
    });
    return this.toMovementDomain(row);
  }

  async applyMovement(
    stockLevel: StockLevel,
    movement: StockMovement,
  ): Promise<{ stockLevel: StockLevel; movement: StockMovement }> {
    const [levelRow, movementRow] = await this.db.$transaction([
      this.db.stockLevel.upsert({
        where: { productId: stockLevel.productId },
        create: {
          id: stockLevel.id,
          productId: stockLevel.productId,
          quantity: stockLevel.quantity,
          minQuantity: stockLevel.minQuantity,
          updatedAt: stockLevel.updatedAt,
        },
        update: {
          quantity: stockLevel.quantity,
          minQuantity: stockLevel.minQuantity,
          updatedAt: stockLevel.updatedAt,
        },
      }),
      this.db.stockMovement.create({
        data: {
          id: movement.id,
          productId: movement.productId,
          type: movement.type.value,
          quantity: movement.quantity,
          reason: movement.reason,
          reference: movement.reference,
          createdAt: movement.createdAt,
        },
      }),
    ]);
    return {
      stockLevel: this.toStockLevelDomain(levelRow),
      movement: this.toMovementDomain(movementRow),
    };
  }

  // ─── Mapping ─────────────────────────────────────────────────────────────

  private toStockLevelDomain(row: PrismaStockLevel): StockLevel {
    return StockLevel.create({
      id: row.id,
      productId: row.productId,
      quantity: row.quantity,
      minQuantity: row.minQuantity,
      updatedAt: row.updatedAt,
    });
  }

  private toMovementDomain(row: PrismaStockMovement): StockMovement {
    return StockMovement.create({
      id: row.id,
      productId: row.productId,
      type: MovementType.create(row.type),
      quantity: row.quantity,
      reason: row.reason,
      reference: row.reference,
      createdAt: row.createdAt,
    });
  }
}
