/**
 * GetDeletedProductCountUseCase
 *
 * Returns the number of products currently in the Papelera (deletedAt IS NOT
 * NULL). Used by the navbar to drive the Papelera badge.
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";

export class GetDeletedProductCountUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(): Promise<number> {
    return this.productRepository.countDeleted();
  }
}
