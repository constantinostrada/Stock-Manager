/**
 * UpdateSupplierUseCase
 *
 * Updates an existing supplier's metadata, enforcing name uniqueness
 * across all other suppliers.
 *
 * LAYER: application
 */

import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import type {
  UpdateSupplierInputDTO,
  SupplierDTO,
} from "@application/dtos/SupplierDTO";
import { SupplierMapper } from "@application/mappers/SupplierMapper";
import {
  ConflictException,
  NotFoundException,
} from "@application/exceptions/ApplicationException";

export class UpdateSupplierUseCase {
  constructor(private readonly supplierRepository: ISupplierRepository) {}

  async execute(dto: UpdateSupplierInputDTO): Promise<SupplierDTO> {
    const supplier = await this.supplierRepository.findById(dto.id);
    if (!supplier) {
      throw new NotFoundException("Supplier", dto.id);
    }

    const name = dto.name.trim();
    const nameTaken = await this.supplierRepository.existsByName(name, dto.id);
    if (nameTaken) {
      throw new ConflictException(
        `A supplier named "${name}" already exists.`,
      );
    }

    const updated = supplier.update({
      name,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      notes: dto.notes ?? null,
    });

    const saved = await this.supplierRepository.update(updated);
    return SupplierMapper.toDTO(saved);
  }
}
