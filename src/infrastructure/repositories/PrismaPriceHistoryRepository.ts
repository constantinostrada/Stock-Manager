/**
 * PrismaPriceHistoryRepository
 *
 * Concrete implementation of IPriceHistoryRepository using Prisma + SQLite.
 *
 * LAYER: infrastructure
 */

import type {
  PrismaClient,
  PriceHistory as PrismaPriceHistory,
} from "@prisma/client";
import { PriceChange } from "@domain/entities/PriceChange";
import type { IPriceHistoryRepository } from "@domain/repositories/IPriceHistoryRepository";

export class PrismaPriceHistoryRepository implements IPriceHistoryRepository {
  constructor(private readonly db: PrismaClient) {}

  async save(change: PriceChange): Promise<PriceChange> {
    const row = await this.db.priceHistory.create({
      data: {
        id: change.id,
        productId: change.productId,
        oldPrice: change.oldPrice,
        newPrice: change.newPrice,
        changedAt: change.changedAt,
      },
    });
    return this.toDomain(row);
  }

  async findByProductId(productId: string): Promise<PriceChange[]> {
    const rows = await this.db.priceHistory.findMany({
      where: { productId },
      orderBy: { changedAt: "asc" },
    });
    return rows.map((r) => this.toDomain(r));
  }

  // ─── Mapping ─────────────────────────────────────────────────────────────

  private toDomain(row: PrismaPriceHistory): PriceChange {
    return PriceChange.create({
      id: row.id,
      productId: row.productId,
      oldPrice: row.oldPrice,
      newPrice: row.newPrice,
      changedAt: row.changedAt,
    });
  }
}
