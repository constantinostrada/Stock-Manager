/**
 * GetInventoryValuationReportUseCase test suite.
 *
 * AC contract:
 *   - grandTotal = Σ(price × quantity) over ACTIVE products only
 *     (soft-deleted exclusion is delegated to productRepository.findAll)
 *   - per-category and per-supplier breakdowns with value, units and % of total
 *   - products without category/supplier land in "Uncategorized" / "No supplier"
 *   - empty catalog → zeroed totals and empty breakdowns
 */
import { describe, expect, it, vi } from "vitest";
import { GetInventoryValuationReportUseCase } from "@application/use-cases/reports/GetInventoryValuationReportUseCase";
import {
  VALUATION_NO_SUPPLIER_LABEL,
  VALUATION_UNCATEGORIZED_LABEL,
} from "@application/dtos/InventoryValuationReportDTO";
import { Product } from "@domain/entities/Product";
import { StockLevel } from "@domain/entities/StockLevel";
import { Category } from "@domain/entities/Category";
import { Supplier } from "@domain/entities/Supplier";
import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";

const NOW = new Date("2026-01-01T00:00:00Z");

function makeProduct(overrides: {
  id: string;
  sku: string;
  price: number;
  categoryId?: string | null;
  supplierId?: string | null;
}): Product {
  return Product.create({
    id: overrides.id,
    name: `Product ${overrides.id}`,
    description: null,
    sku: SKU.create(overrides.sku),
    price: Money.create(overrides.price, "USD"),
    categoryId: overrides.categoryId ?? null,
    supplierId: overrides.supplierId ?? null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  });
}

function makeStockLevel(productId: string, quantity: number): StockLevel {
  return StockLevel.create({
    id: `sl-${productId}`,
    productId,
    quantity,
    minQuantity: 0,
    updatedAt: NOW,
  });
}

function makeCategory(id: string, name: string): Category {
  return Category.create({ id, name, createdAt: NOW, updatedAt: NOW });
}

function makeSupplier(id: string, name: string): Supplier {
  return Supplier.create({
    id,
    name,
    email: null,
    phone: null,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

function makeProductRepo(products: Product[]): IProductRepository {
  return {
    findById: vi.fn(),
    findBySku: vi.fn(),
    findAll: vi.fn(async () => products),
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

function makeStockRepo(levels: StockLevel[]): IStockRepository {
  return {
    findStockLevelByProductId: vi.fn(),
    findAllStockLevels: vi.fn(async () => levels),
    findLowStockLevels: vi.fn(),
    saveStockLevel: vi.fn(),
    findMovementById: vi.fn(),
    findMovements: vi.fn(),
    countMovements: vi.fn(),
    saveMovement: vi.fn(),
    applyMovement: vi.fn(),
  };
}

function makeCategoryRepo(categories: Category[]): ICategoryRepository {
  return {
    findById: vi.fn(),
    findByName: vi.fn(),
    findAll: vi.fn(async () => categories),
    save: vi.fn(),
    delete: vi.fn(),
    existsByName: vi.fn(),
  };
}

function makeSupplierRepo(suppliers: Supplier[]): ISupplierRepository {
  return {
    findById: vi.fn(),
    findByName: vi.fn(),
    findAll: vi.fn(async () => suppliers),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    existsByName: vi.fn(),
  };
}

function makeUseCase(opts: {
  products?: Product[];
  levels?: StockLevel[];
  categories?: Category[];
  suppliers?: Supplier[];
}) {
  const productRepo = makeProductRepo(opts.products ?? []);
  const useCase = new GetInventoryValuationReportUseCase(
    productRepo,
    makeStockRepo(opts.levels ?? []),
    makeCategoryRepo(opts.categories ?? []),
    makeSupplierRepo(opts.suppliers ?? []),
  );
  return { useCase, productRepo };
}

describe("GetInventoryValuationReportUseCase", () => {
  it("computes the grand total as Σ(price × quantity) and aggregates by category and supplier", async () => {
    const categories = [makeCategory("c1", "Periféricos"), makeCategory("c2", "Monitores")];
    const suppliers = [makeSupplier("s1", "ACME")];
    const products = [
      makeProduct({ id: "p1", sku: "MS-01", price: 100, categoryId: "c1", supplierId: "s1" }),
      makeProduct({ id: "p2", sku: "KB-01", price: 50, categoryId: "c1", supplierId: "s1" }),
      makeProduct({ id: "p3", sku: "MN-01", price: 300, categoryId: "c2", supplierId: "s1" }),
    ];
    const levels = [
      makeStockLevel("p1", 10), // 1000
      makeStockLevel("p2", 4), //  200
      makeStockLevel("p3", 2), //  600
    ];
    const { useCase } = makeUseCase({ products, levels, categories, suppliers });

    const report = await useCase.execute();

    expect(report.grandTotal).toBe(1800);
    expect(report.totalUnits).toBe(16);
    expect(report.totalProducts).toBe(3);

    // Sorted by value DESC: Periféricos (1200) then Monitores (600)
    expect(report.byCategory).toEqual([
      {
        groupId: "c1",
        groupName: "Periféricos",
        totalValue: 1200,
        totalUnits: 14,
        productCount: 2,
        percentOfTotal: 66.7,
      },
      {
        groupId: "c2",
        groupName: "Monitores",
        totalValue: 600,
        totalUnits: 2,
        productCount: 1,
        percentOfTotal: 33.3,
      },
    ]);

    expect(report.bySupplier).toEqual([
      {
        groupId: "s1",
        groupName: "ACME",
        totalValue: 1800,
        totalUnits: 16,
        productCount: 3,
        percentOfTotal: 100,
      },
    ]);
  });

  it('groups products without category/supplier under "Uncategorized" / "No supplier"', async () => {
    const products = [
      makeProduct({ id: "p1", sku: "MS-01", price: 100, categoryId: null, supplierId: null }),
    ];
    const levels = [makeStockLevel("p1", 3)];
    const { useCase } = makeUseCase({ products, levels });

    const report = await useCase.execute();

    expect(report.byCategory).toHaveLength(1);
    expect(report.byCategory[0]).toMatchObject({
      groupId: null,
      groupName: VALUATION_UNCATEGORIZED_LABEL,
      totalValue: 300,
      totalUnits: 3,
      percentOfTotal: 100,
    });
    expect(report.bySupplier).toHaveLength(1);
    expect(report.bySupplier[0]).toMatchObject({
      groupId: null,
      groupName: VALUATION_NO_SUPPLIER_LABEL,
      totalValue: 300,
      totalUnits: 3,
      percentOfTotal: 100,
    });
  });

  it("treats a dangling categoryId/supplierId (no matching row) as ungrouped", async () => {
    const products = [
      makeProduct({ id: "p1", sku: "MS-01", price: 10, categoryId: "ghost", supplierId: "ghost" }),
    ];
    const levels = [makeStockLevel("p1", 1)];
    const { useCase } = makeUseCase({ products, levels });

    const report = await useCase.execute();

    expect(report.byCategory[0]?.groupName).toBe(VALUATION_UNCATEGORIZED_LABEL);
    expect(report.bySupplier[0]?.groupName).toBe(VALUATION_NO_SUPPLIER_LABEL);
  });

  it("values products with no stock level row at quantity 0", async () => {
    const products = [
      makeProduct({ id: "p1", sku: "MS-01", price: 100 }),
      makeProduct({ id: "p2", sku: "KB-01", price: 50 }),
    ];
    const levels = [makeStockLevel("p2", 2)];
    const { useCase } = makeUseCase({ products, levels });

    const report = await useCase.execute();

    expect(report.grandTotal).toBe(100);
    expect(report.totalUnits).toBe(2);
    expect(report.totalProducts).toBe(2);
  });

  it("excludes soft-deleted products by sourcing data exclusively from findAll (active rows only)", async () => {
    const { useCase, productRepo } = makeUseCase({
      products: [makeProduct({ id: "p1", sku: "MS-01", price: 100 })],
      levels: [makeStockLevel("p1", 1)],
    });

    await useCase.execute();

    // findAll is the active-only read path; the deleted read paths must not be used.
    expect(productRepo.findAll).toHaveBeenCalledTimes(1);
    expect(productRepo.findAllDeleted).not.toHaveBeenCalled();
  });

  it("returns zeroed totals and empty breakdowns for an empty catalog", async () => {
    const { useCase } = makeUseCase({});

    const report = await useCase.execute();

    expect(report).toEqual({
      grandTotal: 0,
      totalUnits: 0,
      totalProducts: 0,
      byCategory: [],
      bySupplier: [],
    });
  });

  it("rounds monetary totals to 2 decimals", async () => {
    const products = [
      makeProduct({ id: "p1", sku: "MS-01", price: 0.1 }),
      makeProduct({ id: "p2", sku: "KB-01", price: 0.2 }),
    ];
    const levels = [makeStockLevel("p1", 3), makeStockLevel("p2", 3)];
    const { useCase } = makeUseCase({ products, levels });

    const report = await useCase.execute();

    expect(report.grandTotal).toBe(0.9);
    expect(report.byCategory[0]?.totalValue).toBe(0.9);
  });
});
