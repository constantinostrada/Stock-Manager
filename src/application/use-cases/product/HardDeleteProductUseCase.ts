/**
 * HardDeleteProductUseCase
 *
 * Permanently removes a product. Triggered from the Papelera page. The Prisma
 * schema declares `onDelete: Cascade` for StockLevel and StockMovement, so the
 * cascade happens at the database engine level — no manual cleanup needed
 * here. Works on both active and soft-deleted products (findById doesn't
 * filter by deletedAt).
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { DeleteProductInputDTO } from "@application/dtos/ProductDTO";
import { NotFoundException } from "@application/exceptions/ApplicationException";

export class HardDeleteProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(dto: DeleteProductInputDTO): Promise<void> {
    const product = await this.productRepository.findById(dto.id);
    if (!product) {
      throw new NotFoundException("Product", dto.id);
    }
    await this.productRepository.delete(dto.id);
  }
}
