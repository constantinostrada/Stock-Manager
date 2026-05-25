/**
 * Category DTOs
 *
 * Input/output contracts for category-related use cases.
 *
 * LAYER: application
 */

export interface CategoryDTO {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInputDTO {
  name: string;
}

export interface UpdateCategoryInputDTO {
  id: string;
  name: string;
}

export interface DeleteCategoryInputDTO {
  id: string;
}
