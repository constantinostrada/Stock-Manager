/**
 * PrismaCategoryRepository
 *
 * Concrete implementation of ICategoryRepository using Prisma + SQLite.
 *
 * LAYER: infrastructure
 */

import type { PrismaClient, Category as PrismaCategory } from "@prisma/client";
import { Category } from "@domain/entities/Category";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import { ApplicationException } from "@application/exceptions/ApplicationException";

export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<Category | null> {
    const row = await this.db.category.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByName(name: string): Promise<Category | null> {
    const row = await this.db.category.findUnique({ where: { name } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Category[]> {
    const rows = await this.db.category.findMany({ orderBy: { name: "asc" } });
    return rows.map((r) => this.toDomain(r));
  }

  async save(category: Category): Promise<Category> {
    const row = await this.db.category.create({
      data: {
        id: category.id,
        name: category.name,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    });
    return this.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.category.delete({ where: { id } });
    } catch {
      throw new ApplicationException(
        `Failed to delete category with id "${id}".`,
        "DELETE_FAILED",
      );
    }
  }

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const row = await this.db.category.findFirst({
      where: {
        name,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    return row !== null;
  }

  // ─── Mapping ─────────────────────────────────────────────────────────────

  private toDomain(row: PrismaCategory): Category {
    return Category.create({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
