/**
 * T30 — HardDeleteProductUseCase test suite.
 *
 * AC: Action Eliminar permanentemente → confirm + hard DELETE + cascada.
 * The cascade onto StockLevel/StockMovement is declared at the Prisma schema
 * level (`onDelete: Cascade`) — the use case only needs to call repo.delete.
 */
import { describe, expect, it, vi } from "vitest";
import { HardDeleteProductUseCase } from "@application/use-cases/product/HardDeleteProductUseCase";
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
    delete: vi.fn(async () => undefined),
    deleteManyBySkus: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    countDeleted: vi.fn(),
    existsBySku: vi.fn(),
  };
}

describe("HardDeleteProductUseCase (T30)", () => {
  it("delegates to repo.delete(id) — relies on schema cascade for StockLevel/StockMovement", async () => {
    const deletedAt = new Date("2026-05-30T10:00:00Z");
    const product = makeProduct({ deletedAt });
    const repo = makeProductRepo(product);
    const useCase = new HardDeleteProductUseCase(repo);

    await useCase.execute({ id: "p1" });

    expect(repo.findById).toHaveBeenCalledWith("p1");
    expect(repo.delete).toHaveBeenCalledTimes(1);
    expect(repo.delete).toHaveBeenCalledWith("p1");
    expect(repo.softDelete).not.toHaveBeenCalled();
    expect(repo.restore).not.toHaveBeenCalled();
  });

  it("works on both soft-deleted and active products (findById is not filtered)", async () => {
    const active = makeProduct({ deletedAt: null });
    const repo = makeProductRepo(active);
    const useCase = new HardDeleteProductUseCase(repo);

    await useCase.execute({ id: "p1" });

    expect(repo.delete).toHaveBeenCalledWith("p1");
  });

  it("throws NotFoundException when the id does not match a product", async () => {
    const repo = makeProductRepo(null);
    const useCase = new HardDeleteProductUseCase(repo);

    await expect(useCase.execute({ id: "MISSING" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
