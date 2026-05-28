/**
 * PrismaProductRepository
 *
 * Concrete implementation of IProductRepository using Prisma + SQLite.
 * Maps Prisma model rows ↔ domain entities.
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

export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<Product | null> {
    const row = await this.db.product.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const row = await this.db.product.findUnique({ where: { sku } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(filters: ProductFilters = {}): Promise<Product[]> {
    const rows = await this.db.product.findMany({
      where: {
        ...(filters.name && {
          name: { contains: filters.name, mode: "insensitive" as const },
        }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.skuContains && {
          sku: { contains: filters.skuContains.toUpperCase() },
        }),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async save(product: Product): Promise<Product> {
    const row = await this.db.product.create({
      data: this.toPersistence(product),
    });
    return this.toDomain(row);
  }

  async update(product: Product): Promise<Product> {
    const row = await this.db.product.update({
      where: { id: product.id },
      data: this.toPersistence(product),
    });
    return this.toDomain(row);
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

  private toDomain(row: PrismaProduct): Product {
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
    });
  }

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
