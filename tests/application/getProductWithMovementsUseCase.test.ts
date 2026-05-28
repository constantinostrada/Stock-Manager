/**
 * T25 — GetProductWithMovementsUseCase test suite (mocked repos).
 *
 * Covers:
 *   - returns { product, movements, total_movements } for an existing id
 *   - includes supplier in the product DTO
 *   - paginates movements via repo limit/offset and reports total via countMovements
 *   - throws NotFoundException when the id does not exist
 *   - defaults page=1, limit=10 when not provided
 */
import { describe, expect, it, vi } from "vitest";
import { GetProductWithMovementsUseCase } from "@application/use-cases/product/GetProductWithMovementsUseCase";
import { NotFoundException } from "@application/exceptions/ApplicationException";
import { Product } from "@domain/entities/Product";
import { StockLevel } from "@domain/entities/StockLevel";
import { StockMovement } from "@domain/entities/StockMovement";
import { Category } from "@domain/entities/Category";
import { Supplier } from "@domain/entities/Supplier";
import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";
import { MovementType } from "@domain/value-objects/MovementType";

function makeProduct(
  overrides: Partial<{
    id: string;
    sku: string;
    name: string;
    categoryId: string | null;
    supplierId: string | null;
  }> = {},
) {
  return Product.create({
    id: overrides.id ?? "p1",
    name: overrides.name ?? "Mouse",
    description: null,
    sku: SKU.create(overrides.sku ?? "MS-01"),
    price: Money.create(100, "USD"),
    categoryId: overrides.categoryId === undefined ? "cat-1" : overrides.categoryId,
    supplierId: overrides.supplierId === undefined ? "sup-1" : overrides.supplierId,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
  });
}

function makeMovement(id: string, type: "IN" | "OUT" | "ADJUSTMENT", qty: number, createdAt: Date) {
  return StockMovement.create({
    id,
    productId: "p1",
    type: MovementType.create(type),
    quantity: qty,
    reason: null,
    reference: null,
    createdAt,
  });
}

function makeRepos(opts: {
  product?: Product | null;
  stockQty?: number | null;
  movements?: StockMovement[];
  totalMovements?: number;
  category?: Category | null;
  supplier?: Supplier | null;
}) {
  const productRepo = {
    findById: vi.fn(async () => opts.product ?? null),
    findBySku: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteManyBySkus: vi.fn(),
    existsBySku: vi.fn(),
  };
  const stockRepo = {
    findStockLevelByProductId: vi.fn(async () =>
      opts.stockQty == null
        ? null
        : StockLevel.create({
            id: "sl1",
            productId: "p1",
            quantity: opts.stockQty,
            minQuantity: 0,
            updatedAt: new Date(),
          }),
    ),
    findAllStockLevels: vi.fn(),
    findLowStockLevels: vi.fn(),
    saveStockLevel: vi.fn(),
    findMovementById: vi.fn(),
    findMovements: vi.fn(async () => opts.movements ?? []),
    countMovements: vi.fn(async () => opts.totalMovements ?? (opts.movements?.length ?? 0)),
    saveMovement: vi.fn(),
    applyMovement: vi.fn(),
  };
  const categoryRepo = {
    findById: vi.fn(async () => opts.category ?? null),
    findByName: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    existsByName: vi.fn(),
  };
  const supplierRepo = {
    findById: vi.fn(async () => opts.supplier ?? null),
    findByName: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    existsByName: vi.fn(),
  };
  return { productRepo, stockRepo, categoryRepo, supplierRepo };
}

describe("GetProductWithMovementsUseCase (T25)", () => {
  it("returns { product, movements, total_movements } including supplier", async () => {
    const product = makeProduct();
    const category = Category.create({
      id: "cat-1",
      name: "Periféricos",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const supplier = Supplier.create({
      id: "sup-1",
      name: "ACME",
      email: null,
      phone: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const movements = [
      makeMovement("m1", "IN", 10, new Date("2026-02-01T12:00:00Z")),
      makeMovement("m2", "OUT", 3, new Date("2026-02-02T12:00:00Z")),
    ];
    const { productRepo, stockRepo, categoryRepo, supplierRepo } = makeRepos({
      product,
      stockQty: 7,
      movements,
      totalMovements: 2,
      category,
      supplier,
    });

    const useCase = new GetProductWithMovementsUseCase(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      productRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stockRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supplierRepo as any,
    );

    const result = await useCase.execute({ product_id: "p1", page: 1, limit: 10 });

    expect(productRepo.findById).toHaveBeenCalledWith("p1");
    expect(result.product.id).toBe("p1");
    expect(result.product.sku).toBe("MS-01");
    expect(result.product.supplierName).toBe("ACME");
    expect(result.product.categoryName).toBe("Periféricos");
    expect(result.stockLevel?.quantity).toBe(7);
    expect(result.movements).toHaveLength(2);
    expect(result.total_movements).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it("paginates: forwards limit/offset to repo.findMovements and reports total separately", async () => {
    const product = makeProduct({ supplierId: null });
    const movements = [
      makeMovement("m11", "IN", 1, new Date("2026-02-11T12:00:00Z")),
      makeMovement("m12", "IN", 1, new Date("2026-02-12T12:00:00Z")),
    ];
    const { productRepo, stockRepo, categoryRepo, supplierRepo } = makeRepos({
      product,
      stockQty: 5,
      movements,
      totalMovements: 25,
    });
    const useCase = new GetProductWithMovementsUseCase(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      productRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stockRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supplierRepo as any,
    );

    const result = await useCase.execute({ product_id: "p1", page: 2, limit: 10 });

    expect(stockRepo.findMovements).toHaveBeenCalledWith({
      productId: "p1",
      limit: 10,
      offset: 10,
    });
    expect(stockRepo.countMovements).toHaveBeenCalledWith({ productId: "p1" });
    expect(result.total_movements).toBe(25);
    expect(result.movements).toHaveLength(2);
    expect(result.product.supplierName).toBeNull();
  });

  it("defaults page=1, limit=10 when not provided", async () => {
    const product = makeProduct({ supplierId: null });
    const { productRepo, stockRepo, categoryRepo, supplierRepo } = makeRepos({
      product,
      stockQty: 0,
      movements: [],
      totalMovements: 0,
    });
    const useCase = new GetProductWithMovementsUseCase(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      productRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stockRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supplierRepo as any,
    );

    const result = await useCase.execute({ product_id: "p1" });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(stockRepo.findMovements).toHaveBeenCalledWith({
      productId: "p1",
      limit: 10,
      offset: 0,
    });
  });

  it("throws NotFoundException when the product_id does not exist", async () => {
    const { productRepo, stockRepo, categoryRepo, supplierRepo } = makeRepos({
      product: null,
    });
    const useCase = new GetProductWithMovementsUseCase(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      productRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stockRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supplierRepo as any,
    );

    await expect(
      useCase.execute({ product_id: "NOPE" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
