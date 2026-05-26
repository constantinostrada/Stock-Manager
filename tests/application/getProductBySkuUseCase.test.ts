/**
 * T8 — AC-2: getProductBySku Server Action returns { product, movements } and
 *            triggers 404 when SKU does not exist.
 *
 * This file targets the application-layer use case directly (the action is a
 * thin wrapper). The action test sits separately in tests/interfaces/.
 */

import { describe, expect, it, vi } from "vitest";
import { GetProductBySkuUseCase } from "@application/use-cases/product/GetProductBySkuUseCase";
import { NotFoundException } from "@application/exceptions/ApplicationException";
import { Product } from "@domain/entities/Product";
import { StockLevel } from "@domain/entities/StockLevel";
import { StockMovement } from "@domain/entities/StockMovement";
import { Category } from "@domain/entities/Category";
import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";
import { MovementType } from "@domain/value-objects/MovementType";

function makeProduct(overrides: Partial<{ id: string; sku: string; name: string; categoryId: string | null }> = {}) {
  return Product.create({
    id: overrides.id ?? "p1",
    name: overrides.name ?? "Mouse",
    description: null,
    sku: SKU.create(overrides.sku ?? "MS-01"),
    price: Money.create(100, "USD"),
    categoryId: overrides.categoryId === undefined ? "cat-1" : overrides.categoryId,
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
  category?: Category | null;
}) {
  const productRepo = {
    findById: vi.fn(async () => opts.product ?? null),
    findBySku: vi.fn(async () => opts.product ?? null),
    findAll: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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
    saveMovement: vi.fn(),
    applyMovement: vi.fn(),
  };
  const categoryRepo = {
    findById: vi.fn(async () => opts.category ?? null),
    findAll: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    existsByName: vi.fn(),
  };
  return { productRepo, stockRepo, categoryRepo };
}

describe("GetProductBySkuUseCase (T8 AC-2)", () => {
  it("returns { product, stockLevel, movements } for an existing SKU", async () => {
    const product = makeProduct({ sku: "MS-01" });
    const category = Category.create({
      id: "cat-1",
      name: "Periféricos",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const movements = [
      makeMovement("m1", "IN", 10, new Date("2026-02-01T12:00:00Z")),
      makeMovement("m2", "OUT", 3, new Date("2026-02-02T12:00:00Z")),
    ];
    const { productRepo, stockRepo, categoryRepo } = makeRepos({
      product,
      stockQty: 7,
      movements,
      category,
    });

    const useCase = new GetProductBySkuUseCase(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      productRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stockRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo as any,
    );

    const result = await useCase.execute({ sku: "MS-01" });

    expect(productRepo.findBySku).toHaveBeenCalledWith("MS-01");
    expect(stockRepo.findMovements).toHaveBeenCalledWith({ productId: "p1" });

    expect(result.product.sku).toBe("MS-01");
    expect(result.product.name).toBe("Mouse");
    expect(result.product.categoryName).toBe("Periféricos");
    expect(result.stockLevel?.quantity).toBe(7);
    expect(result.movements).toHaveLength(2);
    expect(result.movements[0]!.type).toBe("IN");
    expect(result.movements[1]!.type).toBe("OUT");
  });

  it("throws NotFoundException when SKU does not exist (triggers Next.js notFound at the page)", async () => {
    const { productRepo, stockRepo, categoryRepo } = makeRepos({ product: null });
    const useCase = new GetProductBySkuUseCase(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      productRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stockRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo as any,
    );

    await expect(useCase.execute({ sku: "NOPE" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("returns stockLevel=null + empty movements when product exists but no stock/movements yet", async () => {
    const product = makeProduct({ sku: "MS-02", categoryId: null });
    const { productRepo, stockRepo, categoryRepo } = makeRepos({
      product,
      stockQty: null,
      movements: [],
      category: null,
    });

    const useCase = new GetProductBySkuUseCase(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      productRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stockRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo as any,
    );

    const result = await useCase.execute({ sku: "MS-02" });
    expect(result.stockLevel).toBeNull();
    expect(result.movements).toEqual([]);
    expect(result.product.categoryName).toBeNull();
  });
});
