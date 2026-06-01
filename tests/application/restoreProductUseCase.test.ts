/**
 * T30 — RestoreProductUseCase test suite.
 *
 * AC: Action Restaurar → UPDATE Product SET deletedAt = NULL.
 *   - delegates to repo.restore(id) for a soft-deleted product
 *   - throws NotFoundException when the id is missing
 *   - idempotent for already-active products (no repo.restore call)
 */
import { describe, expect, it, vi } from "vitest";
import { RestoreProductUseCase } from "@application/use-cases/product/RestoreProductUseCase";
import { NotFoundException } from "@application/exceptions/ApplicationException";
import { Product } from "@domain/entities/Product";
import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";
import type { IProductRepository } from "@domain/repositories/IProductRepository";

function makeProduct(overrides: { id?: string; deletedAt?: Date | null } = {}) {
  return Product.create({
    id: overrides.id ?? "p1",
    name: "Mouse",
    description: null,
    sku: SKU.create("MS-01"),
    price: Money.create(100, "USD"),
    categoryId: null,
    supplierId: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
    deletedAt: overrides.deletedAt ?? null,
  });
}

function makeProductRepo(initial: Product | null): IProductRepository {
  return {
    findById: vi.fn(async (id: string) =>
      initial && initial.id === id ? initial : null,
    ),
    findBySku: vi.fn(),
    findAll: vi.fn(),
    findAllDeleted: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteManyBySkus: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(async () => undefined),
    countDeleted: vi.fn(),
    existsBySku: vi.fn(),
  };
}

describe("RestoreProductUseCase (T30)", () => {
  it("delegates to repo.restore(id) for a soft-deleted product", async () => {
    const deletedAt = new Date("2026-05-30T10:00:00Z");
    const product = makeProduct({ deletedAt });
    const repo = makeProductRepo(product);
    const useCase = new RestoreProductUseCase(repo);

    await useCase.execute({ id: "p1" });

    expect(repo.findById).toHaveBeenCalledWith("p1");
    expect(repo.restore).toHaveBeenCalledTimes(1);
    expect(repo.restore).toHaveBeenCalledWith("p1");
    // Hard-delete path must NOT be used.
    expect(repo.delete).not.toHaveBeenCalled();
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when the id does not match a product", async () => {
    const repo = makeProductRepo(null);
    const useCase = new RestoreProductUseCase(repo);

    await expect(useCase.execute({ id: "MISSING" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.restore).not.toHaveBeenCalled();
  });

  it("is idempotent: restore on an already-active product is a no-op", async () => {
    const product = makeProduct({ deletedAt: null });
    const repo = makeProductRepo(product);
    const useCase = new RestoreProductUseCase(repo);

    await useCase.execute({ id: "p1" });

    expect(repo.restore).not.toHaveBeenCalled();
  });
});
