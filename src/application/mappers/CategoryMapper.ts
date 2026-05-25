/**
 * CategoryMapper
 *
 * Maps between Category domain entities and CategoryDTOs.
 *
 * LAYER: application
 */

import type { Category } from "@domain/entities/Category";
import type { CategoryDTO } from "@application/dtos/CategoryDTO";

export class CategoryMapper {
  static toDTO(category: Category): CategoryDTO {
    return {
      id: category.id,
      name: category.name,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }
}
