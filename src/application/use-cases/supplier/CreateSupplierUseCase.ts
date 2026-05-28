/**
 * CreateSupplierUseCase
 *
 * Creates a new supplier, enforcing name uniqueness.
 *
 * LAYER: application
 */

import { Supplier } from "@domain/entities/Supplier";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import type {
  CreateSupplierInputDTO,
  SupplierDTO,
} from "@application/dtos/SupplierDTO";
import { SupplierMapper } from "@application/mappers/SupplierMapper";
import { ConflictException } from "@application/exceptions/ApplicationException";

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export class CreateSupplierUseCase {
  constructor(private readonly supplierRepository: ISupplierRepository) {}

  async execute(dto: CreateSupplierInputDTO): Promise<SupplierDTO> {
    const name = dto.name.trim();
    const nameExists = await this.supplierRepository.existsByName(name);
    if (nameExists) {
      throw new ConflictException(
        `A supplier named "${name}" already exists.`,
      );
    }

    const now = new Date();
    const supplier = Supplier.create({
      id: generateId(),
      name,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      notes: dto.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await this.supplierRepository.save(supplier);
    return SupplierMapper.toDTO(saved);
  }
}
