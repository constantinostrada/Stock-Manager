/**
 * T15 — DeleteProductsBulkUseCase delegates to the repository's transactional
 * deleteManyBySkus and surfaces NotFoundException when any SKU is missing.
 */
import { describe, expect, it, vi } from "vitest";
import { DeleteProductsBulkUseCase } from "@application/use-cases/product/DeleteProductsBulkUseCase";
import { NotFoundException } from "@application/exceptions/ApplicationException";

function makeRepo(deleteManyBySkus: (skus: string[]) => Promise<number>) {
  return {
    findById: vi.fn(),
    findBySku: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteManyBySkus: vi.fn(deleteManyBySkus),
    existsBySku: vi.fn(),
  };
}

describe("DeleteProductsBulkUseCase", () => {
  it("delegates to repository.deleteManyBySkus and returns the count", async () => {
    const repo = makeRepo(async () => 3);
    const useCase = new DeleteProductsBulkUseCase(repo);

    const result = await useCase.execute({ skus: ["A", "B", "C"] });

    expect(repo.deleteManyBySkus).toHaveBeenCalledWith(["A", "B", "C"]);
    expect(result).toEqual({ deletedCount: 3 });
  });

  it("propagates NotFoundException raised by the repository (rollback semantics)", async () => {
    const repo = makeRepo(async () => {
      throw new NotFoundException("Product", "A,B");
    });
    const useCase = new DeleteProductsBulkUseCase(repo);

    await expect(useCase.execute({ skus: ["A", "B"] })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
