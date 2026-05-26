/**
 * DeleteProductsBulkUseCase
 *
 * Deletes multiple products in a single transaction. If any of the requested
 * SKUs cannot be found, the whole operation rolls back so the caller can
 * surface a single error to the user.
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type {
  DeleteProductsBulkInputDTO,
  DeleteProductsBulkResultDTO,
} from "@application/dtos/ProductDTO";

export class DeleteProductsBulkUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(
    dto: DeleteProductsBulkInputDTO,
  ): Promise<DeleteProductsBulkResultDTO> {
    const deletedCount = await this.productRepository.deleteManyBySkus(
      dto.skus,
    );
    return { deletedCount };
  }
}
