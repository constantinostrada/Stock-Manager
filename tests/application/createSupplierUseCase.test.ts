/**
 * Unit tests for CreateSupplierUseCase.
 *
 * Covers AC-2 (use case follows pattern) and AC-5 (unit test per layer).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CreateSupplierUseCase } from "@application/use-cases/supplier/CreateSupplierUseCase";
import { ConflictException } from "@application/exceptions/ApplicationException";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import { Supplier } from "@domain/entities/Supplier";

function makeRepo(): ISupplierRepository {
  return {
    findById: vi.fn(),
    findByName: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    existsByName: vi.fn(),
  };
}

describe("CreateSupplierUseCase", () => {
  let repo: ISupplierRepository;
  let useCase: CreateSupplierUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new CreateSupplierUseCase(repo);
  });

  it("creates a supplier when the name is unique, persisting trimmed values", async () => {
    vi.mocked(repo.existsByName).mockResolvedValue(false);
    vi.mocked(repo.save).mockImplementation(async (s) => s);

    const dto = await useCase.execute({
      name: "  ACME  ",
      email: "  contact@acme.io ",
      phone: "+54 9 11",
      notes: "Pago a 30 días",
    });

    expect(dto.name).toBe("ACME");
    expect(dto.email).toBe("contact@acme.io");
    expect(dto.phone).toBe("+54 9 11");
    expect(dto.notes).toBe("Pago a 30 días");
    expect(repo.existsByName).toHaveBeenCalledWith("ACME");
    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = vi.mocked(repo.save).mock.calls[0]?.[0];
    expect(saved).toBeInstanceOf(Supplier);
  });

  it("throws ConflictException when a supplier with the same name already exists", async () => {
    vi.mocked(repo.existsByName).mockResolvedValue(true);

    await expect(
      useCase.execute({ name: "ACME" }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repo.save).not.toHaveBeenCalled();
  });

  it("persists null for missing optional fields", async () => {
    vi.mocked(repo.existsByName).mockResolvedValue(false);
    vi.mocked(repo.save).mockImplementation(async (s) => s);

    const dto = await useCase.execute({ name: "Plain Supplier" });

    expect(dto.email).toBeNull();
    expect(dto.phone).toBeNull();
    expect(dto.notes).toBeNull();
  });
});
