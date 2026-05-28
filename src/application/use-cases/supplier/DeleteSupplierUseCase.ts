/**
 * DeleteSupplierUseCase
 *
 * Deletes a supplier by ID.
 *
 * LAYER: application
 */

import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import type { DeleteSupplierInputDTO } from "@application/dtos/SupplierDTO";
import { NotFoundException } from "@application/exceptions/ApplicationException";

export class DeleteSupplierUseCase {
  constructor(private readonly supplierRepository: ISupplierRepository) {}

  async execute(dto: DeleteSupplierInputDTO): Promise<void> {
    const supplier = await this.supplierRepository.findById(dto.id);
    if (!supplier) {
      throw new NotFoundException("Supplier", dto.id);
    }
    await this.supplierRepository.delete(dto.id);
  }
}
