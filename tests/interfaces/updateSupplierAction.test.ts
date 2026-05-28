/**
 * Tests for the updateSupplier Server Action (T20).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ConflictException,
  NotFoundException,
} from "@application/exceptions/ApplicationException";

const createExecuteMock = vi.fn();
const listExecuteMock = vi.fn();
const updateExecuteMock = vi.fn();
const deleteExecuteMock = vi.fn();

vi.mock("@infrastructure/container", () => ({
  createSupplierUseCase: { execute: (...args: unknown[]) => createExecuteMock(...args) },
  listSuppliersUseCase: { execute: (...args: unknown[]) => listExecuteMock(...args) },
  updateSupplierUseCase: { execute: (...args: unknown[]) => updateExecuteMock(...args) },
  deleteSupplierUseCase: { execute: (...args: unknown[]) => deleteExecuteMock(...args) },
}));

import { updateSupplier } from "@interfaces/actions/supplierActions";

beforeEach(() => {
  createExecuteMock.mockReset();
  listExecuteMock.mockReset();
  updateExecuteMock.mockReset();
  deleteExecuteMock.mockReset();
});

describe("updateSupplier Server Action (T20)", () => {
  it("returns VALIDATION_ERROR with fieldErrors when id is missing", async () => {
    const r = await updateSupplier({ name: "ACME" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
      expect(r.fieldErrors?.id).toBeTruthy();
    }
    expect(updateExecuteMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR with fieldErrors when name is empty", async () => {
    const r = await updateSupplier({ id: "sup-1", name: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
      expect(r.fieldErrors?.name).toMatch(/obligatorio/i);
    }
    expect(updateExecuteMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR with fieldErrors when email is malformed", async () => {
    const r = await updateSupplier({
      id: "sup-1",
      name: "ACME",
      email: "not-an-email",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
      expect(r.fieldErrors?.email).toMatch(/inválido/i);
    }
  });

  it("returns CONFLICT with fieldErrors.name when name is already taken", async () => {
    updateExecuteMock.mockRejectedValueOnce(
      new ConflictException('A supplier named "Taken" already exists.'),
    );
    const r = await updateSupplier({ id: "sup-1", name: "Taken" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("CONFLICT");
      expect(r.fieldErrors?.name).toBe("El nombre del proveedor ya existe.");
    }
  });

  it("returns NOT_FOUND with a Spanish message when the use case throws NotFoundException", async () => {
    updateExecuteMock.mockRejectedValueOnce(
      new NotFoundException("Supplier", "sup-zzz"),
    );
    const r = await updateSupplier({ id: "sup-zzz", name: "ACME" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("NOT_FOUND");
      expect(r.error).toBe("Proveedor no encontrado.");
    }
  });

  it("delegates a valid payload to the use case and forwards the result", async () => {
    updateExecuteMock.mockResolvedValueOnce({
      id: "sup-1",
      name: "ACME Renombrado",
      email: "info@acme.io",
      phone: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const r = await updateSupplier({
      id: "sup-1",
      name: "ACME Renombrado",
      email: "info@acme.io",
    });

    expect(r.success).toBe(true);
    if (r.success) expect(r.data.name).toBe("ACME Renombrado");
    expect(updateExecuteMock).toHaveBeenCalledTimes(1);
    expect(updateExecuteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sup-1",
        name: "ACME Renombrado",
        email: "info@acme.io",
      }),
    );
  });
});
