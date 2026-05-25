/**
 * ListCategoriesUseCase
 *
 * Returns all product categories.
 *
 * LAYER: application
 */

import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { CategoryDTO } from "@application/dtos/CategoryDTO";
import { CategoryMapper } from "@application/mappers/CategoryMapper";

export class ListCategoriesUseCase {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute(): Promise<CategoryDTO[]> {
    const categories = await this.categoryRepository.findAll();
    return categories.map(CategoryMapper.toDTO);
  }
}
