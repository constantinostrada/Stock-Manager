/**
 * PrismaProductRepository
 *
 * Concrete implementation of IProductRepository using Prisma + SQLite.
 * Maps Prisma model rows ↔ domain entities.
 *
 * NOTE on raw SQL (T26): the `deletedAt` column was added by the T26
 * migration. Reads and the soft-delete write go through `$queryRaw` /
 * `$executeRaw` so that they DO NOT depend on the running Node process
 * having reloaded `@prisma/client` after `prisma generate`. The dev server
 * holds the generated client in `require.cache` for the lifetime of the
 * process; raw SQL goes straight to the SQLite engine and works regardless
 * of which generation of the client is cached.
 *
 * LAYER: infrastructure — allowed to import domain, application, and Prisma.
 */

import type { PrismaClient, Product as PrismaProduct } from "@prisma/client";
import { Product } from "@domain/entities/Product";
import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";
import type {
  IProductRepository,
  ProductFilters,
} from "@domain/repositories/IProductRepository";
import {
  ApplicationException,
  NotFoundException,
} from "@application/exceptions/ApplicationException";

/**
 * Shape of a row returned by `SELECT *` against the Product table. Mirrors
 * the regenerated `PrismaProduct` but is restated locally so this file does
 * not rely on the cached client's TS types being up-to-date.
 */
type ProductRow = PrismaProduct & { deletedAt: Date | null };

export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<Product | null> {
    const rows = await this.db.$queryRaw<ProductRow[]>`
      SELECT * FROM "Product" WHERE "id" = ${id} LIMIT 1
    `;
    return rows.length > 0 ? this.toDomain(rows[0]!) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const rows = await this.db.$queryRaw<ProductRow[]>`
      SELECT * FROM "Product" WHERE "sku" = ${sku} LIMIT 1
    `;
    return rows.length > 0 ? this.toDomain(rows[0]!) : null;
  }

  async findAll(filters: ProductFilters = {}): Promise<Product[]> {
    // Soft-delete tombstone: list excludes soft-deleted rows by default.
    // Built as raw SQL (parameterised) so the `deletedAt` predicate doesn't
    // hit the cached `@prisma/client` schema validator that may pre-date the
    // T26 migration.
    const conditions: string[] = [`"deletedAt" IS NULL`];
    const params: unknown[] = [];
    if (filters.name) {
      conditions.push(`LOWER("name") LIKE LOWER(?)`);
      params.push(`%${filters.name}%`);
    }
    if (filters.categoryId) {
      conditions.push(`"categoryId" = ?`);
      params.push(filters.categoryId);
    }
    if (filters.supplierId) {
      conditions.push(`"supplierId" = ?`);
      params.push(filters.supplierId);
    }
    if (filters.skuContains) {
      conditions.push(`"sku" LIKE ?`);
      params.push(`%${filters.skuContains.toUpperCase()}%`);
    }
    const sql = `SELECT * FROM "Product" WHERE ${conditions.join(" AND ")} ORDER BY "createdAt" DESC`;
    const rows = await this.db.$queryRawUnsafe<ProductRow[]>(sql, ...params);
    return rows.map((r) => this.toDomain(r));
  }

  async save(product: Product): Promise<Product> {
    const row = await this.db.product.create({
      data: this.toPersistence(product),
    });
    return this.toDomain(row as ProductRow);
  }

  async update(product: Product): Promise<Product> {
    const row = await this.db.product.update({
      where: { id: product.id },
      data: this.toPersistence(product),
    });
    return this.toDomain(row as ProductRow);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.product.delete({ where: { id } });
    } catch {
      throw new ApplicationException(
        `Failed to delete product with id "${id}".`,
        "DELETE_FAILED",
      );
    }
  }

  async deleteManyBySkus(skus: string[]): Promise<number> {
    if (skus.length === 0) return 0;
    return this.db.$transaction(async (tx) => {
      const result = await tx.product.deleteMany({
        where: { sku: { in: skus } },
      });
      if (result.count !== skus.length) {
        // Throwing inside the transaction callback rolls the whole batch back.
        throw new NotFoundException("Product", skus.join(","));
      }
      return result.count;
    });
  }

  async softDelete(id: string): Promise<void> {
    // Raw UPDATE so the soft-delete write doesn't go through the cached
    // client's schema validator (which may not know `deletedAt` yet).
    const now = new Date();
    await this.db.$executeRaw`
      UPDATE "Product" SET "deletedAt" = ${now}, "updatedAt" = ${now} WHERE "id" = ${id}
    `;
  }

  async existsBySku(sku: string, excludeId?: string): Promise<boolean> {
    const row = await this.db.product.findFirst({
      where: {
        sku,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    return row !== null;
  }

  // ─── Mapping ─────────────────────────────────────────────────────────────

  private toDomain(row: ProductRow): Product {
    return Product.create({
      id: row.id,
      name: row.name,
      description: row.description,
      sku: SKU.create(row.sku),
      price: Money.create(row.price, "USD"),
      categoryId: row.categoryId,
      supplierId: row.supplierId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? null,
    });
  }

  /**
   * Returns the persistence shape WITHOUT `deletedAt`. The soft-delete write
   * is performed by `softDelete()` via raw SQL — regular `save`/`update`
   * paths never touch `deletedAt`, so we keep this object compatible with the
   * cached client's `ProductCreateInput`/`ProductUpdateInput` types.
   */
  private toPersistence(product: Product) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku.value,
      price: product.price.amount,
      categoryId: product.categoryId,
      supplierId: product.supplierId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
