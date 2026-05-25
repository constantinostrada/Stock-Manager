/**
 * DeleteProductUseCase
 *
 * Deletes a product and its associated stock data (cascade).
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { DeleteProductInputDTO } from "@application/dtos/ProductDTO";
import { NotFoundException } from "@application/exceptions/ApplicationException";

export class DeleteProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(dto: DeleteProductInputDTO): Promise<void> {
    const product = await this.productRepository.findById(dto.id);
    if (!product) {
      throw new NotFoundException("Product", dto.id);
    }
    await this.productRepository.delete(dto.id);
  }
}
