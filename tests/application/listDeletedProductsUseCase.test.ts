/**
 * T30 — ListDeletedProductsUseCase test suite.
 *
 * AC: Ruta /products/trash lista productos donde deletedAt != null.
 *   - calls repo.findAllDeleted()
 *   - maps to ProductDTOs (including deletedAt ISO string)
 *   - returns the products in the order the repo provides them (sorted DESC)
 */
import { describe, expect, it, vi } from "vitest";
import { ListDeletedProductsUseCase } from "@application/use-cases/product/ListDeletedProductsUseCase";
import { Product } from "@domain/entities/Product";
import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";

function makeProduct(opts: { id: string; deletedAt: Date }) {
  return Product.create({
    id: opts.id,
    name: `Producto ${opts.id}`,
    description: null,
    sku: SKU.create(`SKU-${opts.id.toUpperCase()}`),
    price: Money.create(50, "USD"),
    categoryId: null,
    supplierId: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: opts.deletedAt,
    deletedAt: opts.deletedAt,
  });
}

function makeProductRepo(deleted: Product[]): IProductRepository {
  return {
    findById: vi.fn(),
    findBySku: vi.fn(),
    findAll: vi.fn(),
    findAllDeleted: vi.fn(async () => deleted),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteManyBySkus: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    countDeleted: vi.fn(),
    existsBySku: vi.fn(),
  };
}

function makeCategoryRepo(): ICategoryRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByName: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    existsByName: vi.fn(),
  };
}

function makeSupplierRepo(): ISupplierRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByName: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    existsByName: vi.fn(),
  };
}

describe("ListDeletedProductsUseCase (T30)", () => {
  it("calls repo.findAllDeleted and maps each product to a DTO with non-null deletedAt", async () => {
    const a = makeProduct({ id: "p1", deletedAt: new Date("2026-05-30T10:00:00Z") });
    const b = makeProduct({ id: "p2", deletedAt: new Date("2026-05-29T09:00:00Z") });
    const repo = makeProductRepo([a, b]);
    const useCase = new ListDeletedProductsUseCase(
      repo,
      makeCategoryRepo(),
      makeSupplierRepo(),
    );

    const dtos = await useCase.execute();

    expect(repo.findAllDeleted).toHaveBeenCalledTimes(1);
    expect(dtos).toHaveLength(2);
    expect(dtos[0]?.id).toBe("p1");
    expect(dtos[1]?.id).toBe("p2");
    expect(dtos[0]?.deletedAt).toBe(a.deletedAt!.toISOString());
    expect(dtos[1]?.deletedAt).toBe(b.deletedAt!.toISOString());
  });

  it("returns an empty array when there are no soft-deleted products", async () => {
    const repo = makeProductRepo([]);
    const useCase = new ListDeletedProductsUseCase(
      repo,
      makeCategoryRepo(),
      makeSupplierRepo(),
    );

    const dtos = await useCase.execute();

    expect(dtos).toEqual([]);
    expect(repo.findAllDeleted).toHaveBeenCalledTimes(1);
    // Does NOT fall back to findAll (which would include active products).
    expect(repo.findAll).not.toHaveBeenCalled();
  });
});
