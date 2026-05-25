/**
 * CreateCategoryUseCase
 *
 * Creates a new product category, checking for name uniqueness.
 *
 * LAYER: application
 */

import { Category } from "@domain/entities/Category";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { CreateCategoryInputDTO, CategoryDTO } from "@application/dtos/CategoryDTO";
import { CategoryMapper } from "@application/mappers/CategoryMapper";
import { ConflictException } from "@application/exceptions/ApplicationException";

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export class CreateCategoryUseCase {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute(dto: CreateCategoryInputDTO): Promise<CategoryDTO> {
    const nameExists = await this.categoryRepository.existsByName(dto.name);
    if (nameExists) {
      throw new ConflictException(`A category named "${dto.name}" already exists.`);
    }

    const now = new Date();
    const category = Category.create({
      id: generateId(),
      name: dto.name,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await this.categoryRepository.save(category);
    return CategoryMapper.toDTO(saved);
  }
}
