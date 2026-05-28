/**
 * SupplierMapper
 *
 * Maps between Supplier domain entities and SupplierDTOs.
 *
 * LAYER: application
 */

import type { Supplier } from "@domain/entities/Supplier";
import type { SupplierDTO } from "@application/dtos/SupplierDTO";

export class SupplierMapper {
  static toDTO(supplier: Supplier): SupplierDTO {
    return {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      notes: supplier.notes,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
    };
  }
}
