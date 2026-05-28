/**
 * ISupplierRepository
 *
 * Repository interface for the Supplier entity.
 *
 * LAYER: domain — zero external imports allowed.
 */

import type { Supplier } from "@domain/entities/Supplier";

export interface ISupplierRepository {
  findById(id: string): Promise<Supplier | null>;
  findByName(name: string): Promise<Supplier | null>;
  findAll(): Promise<Supplier[]>;
  save(supplier: Supplier): Promise<Supplier>;
  update(supplier: Supplier): Promise<Supplier>;
  delete(id: string): Promise<void>;
  existsByName(name: string, excludeId?: string): Promise<boolean>;
}
