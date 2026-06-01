/**
 * T30 AC-6 — ListProductsUseCase sigue excluyendo soft-deleted por default.
 *
 * The exclusion is implemented at the repository level
 * (`PrismaProductRepository.findAll` adds `deletedAt IS NULL` unconditionally,
 * see T26). This regression test asserts that ListProductsUseCase does NOT
 * opt-in to including soft-deleted rows: it forwards filters as-is, and any
 * row returned by `findAll` is presumed to be active.
 *
 * We assert that:
 *   1) The use case calls `findAll` (not `findAllDeleted`).
 *   2) The forwarded ProductFilters object does NOT carry any
 *      `includeDeleted` flag or other escape hatch.
 *   3) The DTOs come back with `deletedAt: null` (mirroring what the repo
 *      filter guarantees in production).
 */
import { describe, expect, it, vi } from "vitest";
import { ListProductsUseCase } from "@application/use-cases/product/ListProductsUseCase";
import { Product } from "@domain/entities/Product";
import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";

function makeProduct(id: string): Product {
  return Product.create({
    id,
    name: `Producto ${id}`,
    description: null,
    sku: SKU.create(`SKU-${id.toUpperCase()}`),
    price: Money.create(10, "USD"),
    categoryId: null,
    supplierId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });
}

function makeProductRepo(): IProductRepository {
  return {
    findById: vi.fn(),
    findBySku: vi.fn(),
    findAll: vi.fn(),
    findAllDeleted: vi.fn(),
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

describe("ListProductsUseCase — default-excludes-soft-deleted (T30 AC-6)", () => {
  it("calls repo.findAll (not findAllDeleted) — the catalog never lists soft-deleted rows", async () => {
    const productRepo = makeProductRepo();
    vi.mocked(productRepo.findAll).mockResolvedValue([makeProduct("p1")]);

    const useCase = new ListProductsUseCase(
      productRepo,
      makeCategoryRepo(),
      makeSupplierRepo(),
    );
    const dtos = await useCase.execute();

    expect(productRepo.findAll).toHaveBeenCalledTimes(1);
    expect(productRepo.findAllDeleted).not.toHaveBeenCalled();
    expect(dtos).toHaveLength(1);
    expect(dtos[0]?.deletedAt).toBeNull();
  });

  it("does not pass an opt-in escape hatch (no includeDeleted / withDeleted flag) to findAll", async () => {
    const productRepo = makeProductRepo();
    vi.mocked(productRepo.findAll).mockResolvedValue([]);

    const useCase = new ListProductsUseCase(
      productRepo,
      makeCategoryRepo(),
      makeSupplierRepo(),
    );
    await useCase.execute({ name: "foo" });

    const callArg = vi.mocked(productRepo.findAll).mock.calls[0]?.[0] ?? {};
    expect((callArg as Record<string, unknown>).includeDeleted).toBeUndefined();
    expect((callArg as Record<string, unknown>).withDeleted).toBeUndefined();
    // What is forwarded is the standard ProductFilters surface only.
    expect(callArg.name).toBe("foo");
  });
});
