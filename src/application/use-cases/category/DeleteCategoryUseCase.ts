/**
 * DeleteCategoryUseCase
 *
 * Deletes a category by ID.
 *
 * LAYER: application
 */

import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { DeleteCategoryInputDTO } from "@application/dtos/CategoryDTO";
import { NotFoundException } from "@application/exceptions/ApplicationException";

export class DeleteCategoryUseCase {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute(dto: DeleteCategoryInputDTO): Promise<void> {
    const category = await this.categoryRepository.findById(dto.id);
    if (!category) {
      throw new NotFoundException("Category", dto.id);
    }
    await this.categoryRepository.delete(dto.id);
  }
}
