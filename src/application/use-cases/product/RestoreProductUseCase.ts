/**
 * RestoreProductUseCase
 *
 * Counterpart of SoftDeleteProductUseCase. Clears the `deletedAt` tombstone so
 * the product reappears in the catalog. Idempotent: a restore on an already
 * active product returns early without hitting the repository.
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { DeleteProductInputDTO } from "@application/dtos/ProductDTO";
import { NotFoundException } from "@application/exceptions/ApplicationException";

export class RestoreProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(dto: DeleteProductInputDTO): Promise<void> {
    const product = await this.productRepository.findById(dto.id);
    if (!product) {
      throw new NotFoundException("Product", dto.id);
    }
    if (!product.isDeleted) {
      return;
    }
    await this.productRepository.restore(dto.id);
  }
}
