/**
 * AC-1: registerMovement is transactional.
 *
 * The Server Action delegates to AdjustStockUseCase, which must persist the
 * StockMovement audit record AND the new StockLevel in a SINGLE atomic call
 * (`stockRepository.applyMovement`). If the use case ever falls back to two
 * separate writes (saveMovement + saveStockLevel) the audit/level pair can
 * desync — this test guards against that regression.
 */
import { describe, expect, it, vi } from "vitest";
import { AdjustStockUseCase } from "@application/use-cases/stock/AdjustStockUseCase";
import { StockLevel } from "@domain/entities/StockLevel";
import { Product } from "@domain/entities/Product";
import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";

function makeProduct() {
  return Product.create({
    id: "p1",
    name: "Mouse",
    description: null,
    sku: SKU.create("MS-01"),
    price: Money.create(100, "USD"),
    categoryId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeLevel(qty: number) {
  return StockLevel.create({
    id: "sl1",
    productId: "p1",
    quantity: qty,
    minQuantity: 0,
    updatedAt: new Date(),
  });
}

function makeRepos(initialQty: number) {
  const product = makeProduct();
  const level = makeLevel(initialQty);

  const applyMovementMock = vi.fn(async (newLevel, movement) => ({
    stockLevel: newLevel,
    movement,
  }));
  const saveMovementMock = vi.fn();
  const saveStockLevelMock = vi.fn();

  const productRepo = {
    findById: vi.fn(async () => product),
  };
  const stockRepo = {
    findStockLevelByProductId: vi.fn(async () => level),
    findAllStockLevels: vi.fn(),
    findLowStockLevels: vi.fn(),
    saveStockLevel: saveStockLevelMock,
    findMovementById: vi.fn(),
    findMovements: vi.fn(),
    saveMovement: saveMovementMock,
    applyMovement: applyMovementMock,
  };

  return {
    productRepo,
    stockRepo,
    applyMovementMock,
    saveMovementMock,
    saveStockLevelMock,
  };
}

describe("AdjustStockUseCase — atomic write contract (AC-1)", () => {
  it("calls stockRepository.applyMovement exactly once on a successful ENTRADA", async () => {
    const { productRepo, stockRepo, applyMovementMock, saveMovementMock, saveStockLevelMock } =
      makeRepos(5);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useCase = new AdjustStockUseCase(productRepo as any, stockRepo as any);

    await useCase.execute({
      productId: "p1",
      type: "IN",
      quantity: 3,
      reason: "Compra",
    });

    expect(applyMovementMock).toHaveBeenCalledTimes(1);
    // The non-atomic legacy writes must NOT be used anymore.
    expect(saveMovementMock).not.toHaveBeenCalled();
    expect(saveStockLevelMock).not.toHaveBeenCalled();

    // The atomic call received the new level (5+3=8) plus a movement matching the input.
    const [newLevel, movement] = applyMovementMock.mock.calls[0]!;
    expect(newLevel.quantity).toBe(8);
    expect(movement.type.value).toBe("IN");
    expect(movement.quantity).toBe(3);
    expect(movement.reason).toBe("Compra");
  });

  it("throws (rolls back) before any write when SALIDA cantidad > stock_actual", async () => {
    const { productRepo, stockRepo, applyMovementMock } = makeRepos(3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useCase = new AdjustStockUseCase(productRepo as any, stockRepo as any);

    await expect(
      useCase.execute({
        productId: "p1",
        type: "OUT",
        quantity: 10,
        reason: "Venta",
      }),
    ).rejects.toThrow(/Insufficient stock/i);

    // Critically: applyMovement was NEVER called, so nothing was written.
    expect(applyMovementMock).not.toHaveBeenCalled();
  });
});
