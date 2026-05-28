/**
 * T23 — AC: GetInventoryDashboardUseCase aggregates the inventory metrics
 * (totalProducts, totalStockValue, lowStockCount, lowestStockProducts) in a
 * single batched roundtrip per repository.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GetInventoryDashboardUseCase } from "@application/use-cases/dashboard/GetInventoryDashboardUseCase";
import { INVENTORY_DASHBOARD_LOW_STOCK_THRESHOLD } from "@application/dtos/InventoryDashboardDTO";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import { Product } from "@domain/entities/Product";
import { StockLevel } from "@domain/entities/StockLevel";
import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";

function makeProductRepo(): IProductRepository {
  return {
    findById: vi.fn(),
    findBySku: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteManyBySkus: vi.fn(),
    existsBySku: vi.fn(),
  };
}

function makeStockRepo(): IStockRepository {
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

function makeProduct(id: string, name: string, price: number): Product {
  return Product.create({
    id,
    name,
    description: null,
    sku: SKU.create(`SKU-${id.toUpperCase()}`),
    price: Money.create(price, "USD"),
    categoryId: null,
    supplierId: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  });
}

function makeStockLevel(id: string, productId: string, quantity: number): StockLevel {
  return StockLevel.create({
    id,
    productId,
    quantity,
    minQuantity: 0,
    updatedAt: new Date("2026-01-01"),
  });
}

describe("GetInventoryDashboardUseCase — T23 aggregation", () => {
  let productRepo: IProductRepository;
  let stockRepo: IStockRepository;
  let useCase: GetInventoryDashboardUseCase;

  beforeEach(() => {
    productRepo = makeProductRepo();
    stockRepo = makeStockRepo();
    useCase = new GetInventoryDashboardUseCase(productRepo, stockRepo);
  });

  it("AC: returns totalProducts = number of products in the catalog", async () => {
    vi.mocked(productRepo.findAll).mockResolvedValue([
      makeProduct("p1", "Mouse", 10),
      makeProduct("p2", "Teclado", 20),
      makeProduct("p3", "Monitor", 200),
    ]);
    vi.mocked(stockRepo.findAllStockLevels).mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.totalProducts).toBe(3);
  });

  it("AC: totalStockValue is Σ(price × stock) across all products with stock", async () => {
    vi.mocked(productRepo.findAll).mockResolvedValue([
      makeProduct("p1", "Mouse", 10),
      makeProduct("p2", "Teclado", 25),
    ]);
    vi.mocked(stockRepo.findAllStockLevels).mockResolvedValue([
      makeStockLevel("s1", "p1", 7), // 10 * 7 = 70
      makeStockLevel("s2", "p2", 4), // 25 * 4 = 100
    ]);

    const result = await useCase.execute();

    expect(result.totalStockValue).toBe(170);
  });

  it("AC: products without a matching stock level contribute 0 to totalStockValue", async () => {
    vi.mocked(productRepo.findAll).mockResolvedValue([
      makeProduct("p1", "Mouse", 10),
      makeProduct("p2", "Teclado", 25),
    ]);
    vi.mocked(stockRepo.findAllStockLevels).mockResolvedValue([
      makeStockLevel("s1", "p1", 3), // 10 * 3 = 30
      // p2 has no stock level → contributes 0
    ]);

    const result = await useCase.execute();

    expect(result.totalStockValue).toBe(30);
  });

  it("AC: lowStockCount counts products with stock STRICTLY less than 5 (threshold=5)", async () => {
    expect(INVENTORY_DASHBOARD_LOW_STOCK_THRESHOLD).toBe(5);

    vi.mocked(productRepo.findAll).mockResolvedValue([
      makeProduct("p1", "A", 10), // stock 0 → low
      makeProduct("p2", "B", 10), // stock 4 → low
      makeProduct("p3", "C", 10), // stock 5 → NOT low (strict <)
      makeProduct("p4", "D", 10), // stock 6 → NOT low
      makeProduct("p5", "E", 10), // no stock level → stock 0 → low
    ]);
    vi.mocked(stockRepo.findAllStockLevels).mockResolvedValue([
      makeStockLevel("s1", "p1", 0),
      makeStockLevel("s2", "p2", 4),
      makeStockLevel("s3", "p3", 5),
      makeStockLevel("s4", "p4", 6),
    ]);

    const result = await useCase.execute();

    expect(result.lowStockCount).toBe(3);
  });

  it("AC: lowestStockProducts returns up to 5 products sorted ASC by stock with name + currentStock", async () => {
    const products = [
      makeProduct("p1", "Zeta", 1), // 9
      makeProduct("p2", "Alpha", 1), // 2
      makeProduct("p3", "Gamma", 1), // 1
      makeProduct("p4", "Beta", 1), // 0
      makeProduct("p5", "Delta", 1), // 4
      makeProduct("p6", "Epsilon", 1), // 7
      makeProduct("p7", "Theta", 1), // 12
    ];
    vi.mocked(productRepo.findAll).mockResolvedValue(products);
    vi.mocked(stockRepo.findAllStockLevels).mockResolvedValue([
      makeStockLevel("s1", "p1", 9),
      makeStockLevel("s2", "p2", 2),
      makeStockLevel("s3", "p3", 1),
      makeStockLevel("s4", "p4", 0),
      makeStockLevel("s5", "p5", 4),
      makeStockLevel("s6", "p6", 7),
      makeStockLevel("s7", "p7", 12),
    ]);

    const result = await useCase.execute();

    expect(result.lowestStockProducts).toHaveLength(5);
    expect(result.lowestStockProducts.map((p) => p.name)).toEqual([
      "Beta", // 0
      "Gamma", // 1
      "Alpha", // 2
      "Delta", // 4
      "Epsilon", // 7
    ]);
    expect(result.lowestStockProducts[0]).toEqual({
      productId: "p4",
      name: "Beta",
      currentStock: 0,
    });
  });

  it("AC: ties on stock are broken by name ASC for deterministic output", async () => {
    vi.mocked(productRepo.findAll).mockResolvedValue([
      makeProduct("p1", "Charlie", 1),
      makeProduct("p2", "Alpha", 1),
      makeProduct("p3", "Bravo", 1),
    ]);
    vi.mocked(stockRepo.findAllStockLevels).mockResolvedValue([
      makeStockLevel("s1", "p1", 3),
      makeStockLevel("s2", "p2", 3),
      makeStockLevel("s3", "p3", 3),
    ]);

    const result = await useCase.execute();

    expect(result.lowestStockProducts.map((p) => p.name)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
    ]);
  });

  it("AC: returns an empty lowestStockProducts list when the catalog is empty", async () => {
    vi.mocked(productRepo.findAll).mockResolvedValue([]);
    vi.mocked(stockRepo.findAllStockLevels).mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual({
      totalProducts: 0,
      totalStockValue: 0,
      lowStockCount: 0,
      lowestStockProducts: [],
    });
  });

  it("AC: calls each repository exactly once (single roundtrip per repo)", async () => {
    vi.mocked(productRepo.findAll).mockResolvedValue([]);
    vi.mocked(stockRepo.findAllStockLevels).mockResolvedValue([]);

    await useCase.execute();

    expect(productRepo.findAll).toHaveBeenCalledTimes(1);
    expect(stockRepo.findAllStockLevels).toHaveBeenCalledTimes(1);
  });

  it("totalStockValue is rounded to 2 decimals", async () => {
    vi.mocked(productRepo.findAll).mockResolvedValue([
      makeProduct("p1", "Mouse", 9.999),
    ]);
    vi.mocked(stockRepo.findAllStockLevels).mockResolvedValue([
      makeStockLevel("s1", "p1", 3), // 9.999 * 3 = 29.997 → rounded to 30
    ]);

    const result = await useCase.execute();

    expect(result.totalStockValue).toBe(30);
  });
});
