/**
 * ICategoryRepository
 *
 * Repository interface for the Category entity.
 *
 * LAYER: domain — zero external imports allowed.
 */

import type { Category } from "@domain/entities/Category";

export interface ICategoryRepository {
  findById(id: string): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
  findAll(): Promise<Category[]>;
  save(category: Category): Promise<Category>;
  delete(id: string): Promise<void>;
  existsByName(name: string, excludeId?: string): Promise<boolean>;
}
