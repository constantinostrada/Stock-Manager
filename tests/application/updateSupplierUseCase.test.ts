/**
 * Unit tests for UpdateSupplierUseCase.
 *
 * Covers the use case layer of T20 — happy path, NotFound, Conflict, trimming.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { UpdateSupplierUseCase } from "@application/use-cases/supplier/UpdateSupplierUseCase";
import {
  ConflictException,
  NotFoundException,
} from "@application/exceptions/ApplicationException";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import { Supplier } from "@domain/entities/Supplier";

function makeRepo(): ISupplierRepository {
  return {
    findById: vi.fn(),
    findByName: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    existsByName: vi.fn(),
  };
}

function makeSupplier(overrides: Partial<{ id: string; name: string }> = {}): Supplier {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return Supplier.create({
    id: overrides.id ?? "sup-1",
    name: overrides.name ?? "ACME",
    email: "contact@acme.io",
    phone: "+54-9-11",
    notes: "Existing notes",
    createdAt: now,
    updatedAt: now,
  });
}

describe("UpdateSupplierUseCase", () => {
  let repo: ISupplierRepository;
  let useCase: UpdateSupplierUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new UpdateSupplierUseCase(repo);
  });

  it("updates an existing supplier when the new name is unique", async () => {
    vi.mocked(repo.findById).mockResolvedValue(makeSupplier());
    vi.mocked(repo.existsByName).mockResolvedValue(false);
    vi.mocked(repo.update).mockImplementation(async (s) => s);

    const dto = await useCase.execute({
      id: "sup-1",
      name: "  ACME Renombrado  ",
      email: "  new@acme.io ",
      phone: "+54 9 11",
      notes: "Pago a 60 días",
    });

    expect(dto.id).toBe("sup-1");
    expect(dto.name).toBe("ACME Renombrado");
    expect(dto.email).toBe("new@acme.io");
    expect(dto.phone).toBe("+54 9 11");
    expect(dto.notes).toBe("Pago a 60 días");
    expect(repo.existsByName).toHaveBeenCalledWith("ACME Renombrado", "sup-1");
    expect(repo.update).toHaveBeenCalledTimes(1);
    const updated = vi.mocked(repo.update).mock.calls[0]?.[0];
    expect(updated).toBeInstanceOf(Supplier);
  });

  it("throws NotFoundException when the supplier id does not exist", async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);

    await expect(
      useCase.execute({ id: "missing", name: "ACME" }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(repo.existsByName).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("throws ConflictException when another supplier already has the new name", async () => {
    vi.mocked(repo.findById).mockResolvedValue(makeSupplier());
    vi.mocked(repo.existsByName).mockResolvedValue(true);

    await expect(
      useCase.execute({ id: "sup-1", name: "Taken Name" }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repo.update).not.toHaveBeenCalled();
  });

  it("normalises missing optional fields to null", async () => {
    vi.mocked(repo.findById).mockResolvedValue(makeSupplier());
    vi.mocked(repo.existsByName).mockResolvedValue(false);
    vi.mocked(repo.update).mockImplementation(async (s) => s);

    const dto = await useCase.execute({ id: "sup-1", name: "ACME" });

    expect(dto.email).toBeNull();
    expect(dto.phone).toBeNull();
    expect(dto.notes).toBeNull();
  });
});
