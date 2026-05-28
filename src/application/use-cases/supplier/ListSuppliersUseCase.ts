/**
 * ListSuppliersUseCase
 *
 * Returns all suppliers ordered by name (impl-defined).
 *
 * LAYER: application
 */

import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import type { SupplierDTO } from "@application/dtos/SupplierDTO";
import { SupplierMapper } from "@application/mappers/SupplierMapper";

export class ListSuppliersUseCase {
  constructor(private readonly supplierRepository: ISupplierRepository) {}

  async execute(): Promise<SupplierDTO[]> {
    const suppliers = await this.supplierRepository.findAll();
    return suppliers.map(SupplierMapper.toDTO);
  }
}
