/**
 * SoftDeleteProductUseCase
 *
 * Marks a product as soft-deleted by stamping `deletedAt = now()`. The product
 * row stays in the database; stock movements are explicitly preserved (no
 * cascade, no writes against the stock repository) so historical traceability
 * is not lost.
 *
 * AC contract: setea deleted_at = now() y NO toca los movements.
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { DeleteProductInputDTO } from "@application/dtos/ProductDTO";
import { NotFoundException } from "@application/exceptions/ApplicationException";

export class SoftDeleteProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(dto: DeleteProductInputDTO): Promise<void> {
    const product = await this.productRepository.findById(dto.id);
    if (!product) {
      throw new NotFoundException("Product", dto.id);
    }
    if (product.isDeleted) {
      return;
    }
    await this.productRepository.softDelete(dto.id);
  }
}
