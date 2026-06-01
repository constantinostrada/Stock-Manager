/**
 * T27 — UC tests: ListProductsUseCase forwards the sort DTO to
 * IProductRepository.findAll so the Prisma layer can apply ORDER BY.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ListProductsUseCase } from "@application/use-cases/product/ListProductsUseCase";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";

function makeProductRepo(): IProductRepository {
  return {
    findById: vi.fn(),
    findBySku: vi.fn(),
    findAll: vi.fn().mockResolvedValue([]),
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

describe("ListProductsUseCase — T27 sort forwarding", () => {
  let productRepo: IProductRepository;
  let useCase: ListProductsUseCase;

  beforeEach(() => {
    productRepo = makeProductRepo();
    useCase = new ListProductsUseCase(
      productRepo,
      makeCategoryRepo(),
      makeSupplierRepo(),
    );
  });

  it("forwards `sort: { field, direction }` to repo.findAll", async () => {
    await useCase.execute({ sort: { field: "name", direction: "asc" } });
    expect(productRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: { field: "name", direction: "asc" },
      }),
    );
  });

  it("forwards each supported (field, direction) combination", async () => {
    const combos = [
      { field: "name", direction: "asc" },
      { field: "name", direction: "desc" },
      { field: "price", direction: "asc" },
      { field: "price", direction: "desc" },
      { field: "stock", direction: "asc" },
      { field: "stock", direction: "desc" },
    ] as const;
    for (const s of combos) {
      vi.mocked(productRepo.findAll).mockClear();
      await useCase.execute({ sort: s });
      expect(productRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ sort: s }),
      );
    }
  });

  it("when sort is omitted, repo.findAll is called without a sort property", async () => {
    await useCase.execute({});
    expect(productRepo.findAll).toHaveBeenCalledTimes(1);
    const callArg = vi.mocked(productRepo.findAll).mock.calls[0]?.[0] ?? {};
    expect(callArg.sort).toBeUndefined();
  });
});
