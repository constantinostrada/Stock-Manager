/**
 * T22 AC-5 — RegisterStockMovementUseCase test suite.
 *
 * Covers:
 *   - IN (ENTRADA) suma al stock y persiste atomically via applyMovement
 *   - OUT (SALIDA) resta al stock y persiste atomically via applyMovement
 *   - OUT con stock insuficiente lanza InsufficientStockError y NO escribe
 */
import { describe, expect, it, vi } from "vitest";
import { RegisterStockMovementUseCase } from "@application/use-cases/stock/RegisterStockMovementUseCase";
import { InsufficientStockError } from "@domain/exceptions/InsufficientStockError";
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
    supplierId: null,
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

  const productRepo = {
    findById: vi.fn(async () => product),
  };
  const stockRepo = {
    findStockLevelByProductId: vi.fn(async () => level),
    findAllStockLevels: vi.fn(),
    findLowStockLevels: vi.fn(),
    saveStockLevel: vi.fn(),
    findMovementById: vi.fn(),
    findMovements: vi.fn(),
    saveMovement: vi.fn(),
    applyMovement: applyMovementMock,
  };

  return { productRepo, stockRepo, applyMovementMock };
}

describe("RegisterStockMovementUseCase — AC-5", () => {
  it("IN suma al stock (10 + 5 = 15) y escribe atomically", async () => {
    const { productRepo, stockRepo, applyMovementMock } = makeRepos(10);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useCase = new RegisterStockMovementUseCase(productRepo as any, stockRepo as any);

    const result = await useCase.execute({
      productId: "p1",
      type: "IN",
      quantity: 5,
      reason: "Compra",
    });

    expect(applyMovementMock).toHaveBeenCalledTimes(1);
    const [newLevel, movement] = applyMovementMock.mock.calls[0]!;
    expect(newLevel.quantity).toBe(15);
    expect(movement.type.value).toBe("IN");
    expect(movement.quantity).toBe(5);
    expect(movement.reason).toBe("Compra");
    expect(result.quantity).toBe(15);
  });

  it("OUT resta al stock (10 - 3 = 7) y escribe atomically", async () => {
    const { productRepo, stockRepo, applyMovementMock } = makeRepos(10);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useCase = new RegisterStockMovementUseCase(productRepo as any, stockRepo as any);

    const result = await useCase.execute({
      productId: "p1",
      type: "OUT",
      quantity: 3,
      reason: "Venta",
    });

    expect(applyMovementMock).toHaveBeenCalledTimes(1);
    const [newLevel, movement] = applyMovementMock.mock.calls[0]!;
    expect(newLevel.quantity).toBe(7);
    expect(movement.type.value).toBe("OUT");
    expect(movement.quantity).toBe(3);
    expect(movement.reason).toBe("Venta");
    expect(result.quantity).toBe(7);
  });

  it("OUT con stock insuficiente lanza InsufficientStockError y NO escribe", async () => {
    const { productRepo, stockRepo, applyMovementMock } = makeRepos(5);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useCase = new RegisterStockMovementUseCase(productRepo as any, stockRepo as any);

    await expect(
      useCase.execute({
        productId: "p1",
        type: "OUT",
        quantity: 10,
        reason: "Venta",
      }),
    ).rejects.toBeInstanceOf(InsufficientStockError);

    expect(applyMovementMock).not.toHaveBeenCalled();
  });

  it("InsufficientStockError exposes requested/available y el mensaje literal", async () => {
    const { productRepo, stockRepo } = makeRepos(5);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useCase = new RegisterStockMovementUseCase(productRepo as any, stockRepo as any);

    try {
      await useCase.execute({
        productId: "p1",
        type: "OUT",
        quantity: 10,
        reason: "Venta",
      });
      throw new Error("Expected InsufficientStockError to be thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(InsufficientStockError);
      const err = e as InsufficientStockError;
      expect(err.requested).toBe(10);
      expect(err.available).toBe(5);
      expect(err.message).toBe("Insufficient stock. Requested 10, available 5.");
    }
  });
});
