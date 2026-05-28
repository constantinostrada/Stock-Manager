/**
 * Supplier DTOs
 *
 * Input/output contracts for supplier-related use cases.
 *
 * LAYER: application
 */

export interface SupplierDTO {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierInputDTO {
  name: string;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  notes?: string | null | undefined;
}

export interface UpdateSupplierInputDTO {
  id: string;
  name: string;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  notes?: string | null | undefined;
}

export interface DeleteSupplierInputDTO {
  id: string;
}
