/**
 * T26 — SoftDeleteProductUseCase test suite.
 *
 * AC contract:
 *   - setea deleted_at = now() (via repo.softDelete)
 *   - NO toca los movements (no stock-repo calls)
 *   - throws NotFoundException when the id is missing
 *   - idempotent for already-deleted products
 */
import { describe, expect, it, vi } from "vitest";
import { SoftDeleteProductUseCase } from "@application/use-cases/product/SoftDeleteProductUseCase";
import { NotFoundException } from "@application/exceptions/ApplicationException";
import { Product } from "@domain/entities/Product";
import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";

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
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteManyBySkus: vi.fn(),
    softDelete: vi.fn(async () => undefined),
    existsBySku: vi.fn(),
  };
}

/**
 * Sentinel stock repo: NONE of its methods may be called by
 * SoftDeleteProductUseCase. We assert on this directly.
 */
function makeStockRepoSentinel(): IStockRepository {
  return {
    findStockLevelByProductId: vi.fn(),
    findAllStockLevels: vi.fn(),
    findLowStockLevels: vi.fn(),
    saveStockLevel: vi.fn(),
    findMovementById: vi.fn(),
    findMovements: vi.fn(),
    countMovements: vi.fn(),
    saveMovement: vi.fn(),
    applyMovement: vi.fn(),
  };
}

describe("SoftDeleteProductUseCase (T26)", () => {
  it("delegates to repo.softDelete(id) — the repo stamps deleted_at = now()", async () => {
    const product = makeProduct({ deletedAt: null });
    const repo = makeProductRepo(product);
    const useCase = new SoftDeleteProductUseCase(repo);

    await useCase.execute({ id: "p1" });

    expect(repo.findById).toHaveBeenCalledWith("p1");
    expect(repo.softDelete).toHaveBeenCalledTimes(1);
    expect(repo.softDelete).toHaveBeenCalledWith("p1");
    // Hard-delete path must NOT be used.
    expect(repo.delete).not.toHaveBeenCalled();
    expect(repo.deleteManyBySkus).not.toHaveBeenCalled();
    // The generic `update` is not the soft-delete write path.
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("does NOT touch any stock-repository method (movements are preserved)", async () => {
    const product = makeProduct();
    const productRepo = makeProductRepo(product);
    const stockRepo = makeStockRepoSentinel();

    // The use case constructor takes only the product repo — but we construct
    // a stock-repo sentinel and verify NONE of its methods were called by the
    // soft-delete path. This locks in "NO toca los movements".
    const useCase = new SoftDeleteProductUseCase(productRepo);
    await useCase.execute({ id: "p1" });

    for (const fn of Object.values(stockRepo)) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it("throws NotFoundException when the id does not match a product", async () => {
    const repo = makeProductRepo(null);
    const useCase = new SoftDeleteProductUseCase(repo);

    await expect(useCase.execute({ id: "MISSING" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it("is idempotent: a second soft-delete on an already-deleted product is a no-op", async () => {
    const earlier = new Date("2026-04-01T10:00:00Z");
    const product = makeProduct({ deletedAt: earlier });
    const repo = makeProductRepo(product);
    const useCase = new SoftDeleteProductUseCase(repo);

    await useCase.execute({ id: "p1" });

    expect(repo.softDelete).not.toHaveBeenCalled();
  });
});
