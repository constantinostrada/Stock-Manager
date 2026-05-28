/**
 * PrismaSupplierRepository
 *
 * Concrete implementation of ISupplierRepository using Prisma + SQLite.
 *
 * LAYER: infrastructure
 */

import type { PrismaClient, Supplier as PrismaSupplier } from "@prisma/client";
import { Supplier } from "@domain/entities/Supplier";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import { ApplicationException } from "@application/exceptions/ApplicationException";

export class PrismaSupplierRepository implements ISupplierRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<Supplier | null> {
    const row = await this.db.supplier.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByName(name: string): Promise<Supplier | null> {
    const row = await this.db.supplier.findUnique({ where: { name } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Supplier[]> {
    const rows = await this.db.supplier.findMany({ orderBy: { name: "asc" } });
    return rows.map((r) => this.toDomain(r));
  }

  async save(supplier: Supplier): Promise<Supplier> {
    const row = await this.db.supplier.create({
      data: {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        notes: supplier.notes,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
      },
    });
    return this.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.supplier.delete({ where: { id } });
    } catch {
      throw new ApplicationException(
        `Failed to delete supplier with id "${id}".`,
        "DELETE_FAILED",
      );
    }
  }

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const row = await this.db.supplier.findFirst({
      where: {
        name,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    return row !== null;
  }

  // ─── Mapping ─────────────────────────────────────────────────────────────

  private toDomain(row: PrismaSupplier): Supplier {
    return Supplier.create({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
