/**
 * Tests for the createSupplier / listSuppliers / deleteSupplier Server Actions.
 * Covers AC-3 (server actions exist + delegate correctly) and AC-5.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ConflictException, NotFoundException } from "@application/exceptions/ApplicationException";

const createExecuteMock = vi.fn();
const listExecuteMock = vi.fn();
const deleteExecuteMock = vi.fn();

vi.mock("@infrastructure/container", () => ({
  createSupplierUseCase: { execute: (...args: unknown[]) => createExecuteMock(...args) },
  listSuppliersUseCase: { execute: (...args: unknown[]) => listExecuteMock(...args) },
  deleteSupplierUseCase: { execute: (...args: unknown[]) => deleteExecuteMock(...args) },
}));

import {
  createSupplier,
  listSuppliers,
  deleteSupplier,
} from "@interfaces/actions/supplierActions";

beforeEach(() => {
  createExecuteMock.mockReset();
  listExecuteMock.mockReset();
  deleteExecuteMock.mockReset();
});

describe("createSupplier", () => {
  it("returns VALIDATION_ERROR with fieldErrors when name is missing", async () => {
    const r = await createSupplier({ name: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
      expect(r.fieldErrors?.name).toMatch(/obligatorio/i);
    }
    expect(createExecuteMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR with fieldErrors when email is malformed", async () => {
    const r = await createSupplier({ name: "ACME", email: "not-an-email" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("VALIDATION_ERROR");
      expect(r.fieldErrors?.email).toMatch(/inválido/i);
    }
  });

  it("returns CONFLICT with fieldErrors.name when name is already taken", async () => {
    createExecuteMock.mockRejectedValueOnce(
      new ConflictException('A supplier named "ACME" already exists.'),
    );
    const r = await createSupplier({ name: "ACME" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("CONFLICT");
      expect(r.fieldErrors?.name).toBe("El nombre del proveedor ya existe.");
    }
  });

  it("delegates a valid payload to the use case and forwards the result", async () => {
    createExecuteMock.mockResolvedValueOnce({
      id: "sup-1",
      name: "ACME",
      email: null,
      phone: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const r = await createSupplier({ name: "ACME" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.id).toBe("sup-1");
    expect(createExecuteMock).toHaveBeenCalledTimes(1);
    expect(createExecuteMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ACME" }),
    );
  });
});

describe("listSuppliers", () => {
  it("returns the use case result", async () => {
    listExecuteMock.mockResolvedValueOnce([{ id: "s1", name: "A" }]);
    const r = await listSuppliers();
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveLength(1);
  });
});

describe("deleteSupplier", () => {
  it("returns VALIDATION_ERROR when id is missing", async () => {
    const r = await deleteSupplier({ id: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("VALIDATION_ERROR");
  });

  it("returns NOT_FOUND with a Spanish message when the supplier does not exist", async () => {
    deleteExecuteMock.mockRejectedValueOnce(
      new NotFoundException("Supplier", "sup-zzz"),
    );
    const r = await deleteSupplier({ id: "sup-zzz" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe("NOT_FOUND");
      expect(r.error).toBe("Proveedor no encontrado.");
    }
  });

  it("delegates to the use case on success", async () => {
    deleteExecuteMock.mockResolvedValueOnce(undefined);
    const r = await deleteSupplier({ id: "sup-1" });
    expect(r.success).toBe(true);
    expect(deleteExecuteMock).toHaveBeenCalledWith({ id: "sup-1" });
  });
});
