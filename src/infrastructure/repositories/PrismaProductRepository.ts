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

    // T27 — sort. Field/direction are whitelisted enums (see ProductSort), so
    // string-interpolating them into the SQL is safe. Stock sort needs a JOIN
    // with StockLevel so it can order by the related quantity column; for
    // name/price we order on the Product column directly, keeping the bare
    // (un-aliased) SQL shape so prior T26 tests still match.
    const sort = filters.sort;
    let sql: string;
    if (sort && sort.field === "stock") {
      const dir = sort.direction === "desc" ? "DESC" : "ASC";
      const stockConditions: string[] = [`p."deletedAt" IS NULL`];
      if (filters.name) stockConditions.push(`LOWER(p."name") LIKE LOWER(?)`);
      if (filters.categoryId) stockConditions.push(`p."categoryId" = ?`);
      if (filters.supplierId) stockConditions.push(`p."supplierId" = ?`);
      if (filters.skuContains) stockConditions.push(`p."sku" LIKE ?`);
      sql = `SELECT p.* FROM "Product" p LEFT JOIN "StockLevel" sl ON sl."productId" = p."id" WHERE ${stockConditions.join(" AND ")} ORDER BY COALESCE(sl."quantity", 0) ${dir}`;
    } else {
      let orderClause = `ORDER BY "createdAt" DESC`;
      if (sort) {
        const dir = sort.direction === "desc" ? "DESC" : "ASC";
        if (sort.field === "name") orderClause = `ORDER BY LOWER("name") ${dir}`;
        else if (sort.field === "price") orderClause = `ORDER BY "price" ${dir}`;
      }
      sql = `SELECT * FROM "Product" WHERE ${conditions.join(" AND ")} ${orderClause}`;
    }
    const rows = await this.db.$queryRawUnsafe<ProductRow[]>(sql, ...params);
    return rows.map((r) => this.toDomain(r));
  }

  async findAllDeleted(): Promise<Product[]> {
    // Papelera listing. Raw SQL for the same reason `findAll` uses raw SQL:
    // the cached `@prisma/client` may not yet know `deletedAt`.
    const rows = await this.db.$queryRaw<ProductRow[]>`
      SELECT * FROM "Product" WHERE "deletedAt" IS NOT NULL ORDER BY "deletedAt" DESC
    `;
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

  async restore(id: string): Promise<void> {
    // Raw UPDATE: clears the tombstone and refreshes updatedAt.
    const now = new Date();
    await this.db.$executeRaw`
      UPDATE "Product" SET "deletedAt" = NULL, "updatedAt" = ${now} WHERE "id" = ${id}
    `;
  }

  async countDeleted(): Promise<number> {
    // Raw COUNT so the predicate runs without going through the cached client's
    // schema validator. SQLite returns BigInt for COUNT(*); coerce to number.
    const rows = await this.db.$queryRaw<Array<{ count: number | bigint }>>`
      SELECT COUNT(*) as count FROM "Product" WHERE "deletedAt" IS NOT NULL
    `;
    const raw = rows[0]?.count ?? 0;
    return typeof raw === "bigint" ? Number(raw) : raw;
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
