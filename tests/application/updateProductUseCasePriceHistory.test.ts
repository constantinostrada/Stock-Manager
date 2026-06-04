/**
 * T4 — UpdateProductUseCase price-history capture (mocked repos).
 *
 * Covers:
 *   - editing the price creates exactly ONE PriceChange entry (old → new)
 *   - editing other fields (name, description) creates NO entry
 *   - sending the same price creates NO entry
 *   - the entry is recorded with the pre-update price as oldPrice
 */
import { describe, expect, it, vi } from "vitest";
import { UpdateProductUseCase } from "@application/use-cases/product/UpdateProductUseCase";
import { Product } from "@domain/entities/Product";
import { PriceChange } from "@domain/entities/PriceChange";
import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";

function makeProduct(price = 100) {
  return Product.create({
    id: "p1",
    name: "Mouse",
    description: null,
    sku: SKU.create("MS-01"),
    price: Money.create(price, "USD"),
    categoryId: null,
    supplierId: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
  });
}

function makeRepos(product: Product | null) {
  const productRepo = {
    findById: vi.fn(async () => product),
    findBySku: vi.fn(),
    findAll: vi.fn(),
    findAllDeleted: vi.fn(),
    save: vi.fn(),
    update: vi.fn(async (p: Product) => p),
    delete: vi.fn(),
    deleteManyBySkus: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    countDeleted: vi.fn(),
    existsBySku: vi.fn(),
  };
  const categoryRepo = {
    findById: vi.fn(async () => null),
    findByName: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  };
  const supplierRepo = {
    findById: vi.fn(async () => null),
    findByName: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const saveHistoryMock = vi.fn(async (c: PriceChange) => c);
  const priceHistoryRepo = {
    save: saveHistoryMock,
    findByProductId: vi.fn(async () => []),
  };
  return { productRepo, categoryRepo, supplierRepo, priceHistoryRepo, saveHistoryMock };
}

function makeUseCase(product: Product | null) {
  const repos = makeRepos(product);
  const useCase = new UpdateProductUseCase(
    repos.productRepo as any,
    repos.categoryRepo as any,
    repos.supplierRepo as any,
    repos.priceHistoryRepo as any,
  );
  return { useCase, ...repos };
}

describe("UpdateProductUseCase — price history capture (T4)", () => {
  it("creates exactly one history entry when the price changes", async () => {
    const { useCase, saveHistoryMock } = makeUseCase(makeProduct(100));

    await useCase.execute({ id: "p1", price: 150 });

    expect(saveHistoryMock).toHaveBeenCalledTimes(1);
    const entry = saveHistoryMock.mock.calls[0]![0] as PriceChange;
    expect(entry).toBeInstanceOf(PriceChange);
    expect(entry.productId).toBe("p1");
    expect(entry.oldPrice).toBe(100);
    expect(entry.newPrice).toBe(150);
    expect(entry.changedAt).toBeInstanceOf(Date);
  });

  it("creates NO entry when only non-price fields are edited", async () => {
    const { useCase, saveHistoryMock } = makeUseCase(makeProduct(100));

    await useCase.execute({
      id: "p1",
      name: "Mouse inalámbrico",
      description: "Nuevo modelo",
    });

    expect(saveHistoryMock).not.toHaveBeenCalled();
  });

  it("creates NO entry when the submitted price equals the current price", async () => {
    const { useCase, saveHistoryMock } = makeUseCase(makeProduct(100));

    await useCase.execute({ id: "p1", price: 100 });

    expect(saveHistoryMock).not.toHaveBeenCalled();
  });

  it("records a decrease with the pre-update price as oldPrice", async () => {
    const { useCase, saveHistoryMock } = makeUseCase(makeProduct(200));

    await useCase.execute({ id: "p1", price: 50, name: "Mouse Pro" });

    expect(saveHistoryMock).toHaveBeenCalledTimes(1);
    const entry = saveHistoryMock.mock.calls[0]![0] as PriceChange;
    expect(entry.oldPrice).toBe(200);
    expect(entry.newPrice).toBe(50);
    expect(entry.deltaPercent).toBe(-75);
  });

  it("does not write history when the product does not exist", async () => {
    const { useCase, saveHistoryMock } = makeUseCase(null);

    await expect(useCase.execute({ id: "ghost", price: 10 })).rejects.toThrow();
    expect(saveHistoryMock).not.toHaveBeenCalled();
  });
});
