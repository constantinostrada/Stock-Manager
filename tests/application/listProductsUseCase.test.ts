/**
 * T21 — AC: "La action listProducts filtra por name contains q
 * case-insensitive" / "Si q es vacío, devuelve todos".
 *
 * Verifies that ListProductsUseCase forwards the `name` filter to the
 * IProductRepository.findAll call so the (Prisma) repo can apply the
 * case-insensitive `contains` predicate, and that omitting `name` yields
 * a repo call with no `name` predicate (= all products returned).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ListProductsUseCase } from "@application/use-cases/product/ListProductsUseCase";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import { Product } from "@domain/entities/Product";
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
    softDelete: vi.fn(),
    existsBySku: vi.fn(),
  };
}

function makeCategoryRepo(): ICategoryRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByName: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    existsByName: vi.fn(),
  };
}

function makeSupplierRepo(): ISupplierRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByName: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    existsByName: vi.fn(),
  };
}

function makeProduct(id: string, name: string): Product {
  return Product.create({
    id,
    name,
    description: null,
    sku: SKU.create(`SKU-${id.toUpperCase()}`),
    price: Money.create(10, "USD"),
    categoryId: null,
    supplierId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe("ListProductsUseCase — T21 name filter", () => {
  let productRepo: IProductRepository;
  let categoryRepo: ICategoryRepository;
  let supplierRepo: ISupplierRepository;
  let useCase: ListProductsUseCase;

  beforeEach(() => {
    productRepo = makeProductRepo();
    categoryRepo = makeCategoryRepo();
    supplierRepo = makeSupplierRepo();
    useCase = new ListProductsUseCase(productRepo, categoryRepo, supplierRepo);
  });

  it("forwards `name` to repo.findAll so the case-insensitive contains filter runs server-side", async () => {
    vi.mocked(productRepo.findAll).mockResolvedValue([makeProduct("p1", "Mouse Logitech")]);

    const dtos = await useCase.execute({ name: "mou" });

    expect(productRepo.findAll).toHaveBeenCalledTimes(1);
    expect(productRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ name: "mou" }),
    );
    expect(dtos).toHaveLength(1);
    expect(dtos[0]?.name).toBe("Mouse Logitech");
  });

  it("when `name` is omitted (q vacío), repo.findAll is called without a name predicate → devuelve todos", async () => {
    vi.mocked(productRepo.findAll).mockResolvedValue([
      makeProduct("p1", "Mouse"),
      makeProduct("p2", "Teclado"),
      makeProduct("p3", "Monitor"),
    ]);

    const dtos = await useCase.execute({});

    expect(productRepo.findAll).toHaveBeenCalledTimes(1);
    const callArg = vi.mocked(productRepo.findAll).mock.calls[0]?.[0] ?? {};
    expect(callArg.name).toBeUndefined();
    expect(dtos).toHaveLength(3);
  });

  it("forwards an empty execute() the same as omitting the filter", async () => {
    vi.mocked(productRepo.findAll).mockResolvedValue([makeProduct("p1", "X")]);

    const dtos = await useCase.execute();

    expect(productRepo.findAll).toHaveBeenCalledTimes(1);
    const callArg = vi.mocked(productRepo.findAll).mock.calls[0]?.[0] ?? {};
    expect(callArg.name).toBeUndefined();
    expect(dtos).toHaveLength(1);
  });
});
