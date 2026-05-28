/**
 * Supplier Server Actions
 *
 * LAYER: interfaces
 */

"use server";

import {
  createSupplierUseCase,
  listSuppliersUseCase,
  deleteSupplierUseCase,
} from "@infrastructure/container";
import {
  createSupplierSchema,
  deleteSupplierSchema,
} from "@interfaces/validation/supplierSchemas";
import {
  runAction,
  err,
  type ActionResult,
} from "@interfaces/actions/actionHelpers";
import type { SupplierDTO } from "@application/dtos/SupplierDTO";

function firstFieldErrors(
  flat: Record<string, string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(flat)) {
    const list = flat[key];
    if (list && list.length > 0 && list[0]) {
      out[key] = list[0];
    }
  }
  return out;
}

export async function createSupplier(
  rawInput: unknown,
): Promise<ActionResult<SupplierDTO>> {
  const parsed = createSupplierSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors = firstFieldErrors(parsed.error.flatten().fieldErrors);
    return err(
      Object.values(fieldErrors)[0] ?? "Datos inválidos.",
      "VALIDATION_ERROR",
      fieldErrors,
    );
  }

  const result = await runAction(() =>
    createSupplierUseCase.execute(parsed.data),
  );

  if (!result.success && result.code === "CONFLICT") {
    return err("El nombre del proveedor ya existe.", "CONFLICT", {
      name: "El nombre del proveedor ya existe.",
    });
  }
  return result;
}

export async function listSuppliers(): Promise<ActionResult<SupplierDTO[]>> {
  return runAction(() => listSuppliersUseCase.execute());
}

export async function deleteSupplier(
  rawInput: unknown,
): Promise<ActionResult<void>> {
  const parsed = deleteSupplierSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(
      parsed.error.errors.map((e) => e.message).join("; "),
      "VALIDATION_ERROR",
    );
  }

  const result = await runAction(() =>
    deleteSupplierUseCase.execute(parsed.data),
  );
  if (!result.success && result.code === "NOT_FOUND") {
    return err("Proveedor no encontrado.", "NOT_FOUND");
  }
  return result;
}
