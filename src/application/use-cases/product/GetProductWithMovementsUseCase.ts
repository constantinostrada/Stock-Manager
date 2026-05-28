/**
 * GetProductWithMovementsUseCase
 *
 * Retrieves a product (by id) together with a paginated slice of its movement
 * history and the total count. Used by the /products/[id] detail page (T25).
 *
 * AC contract: single use-case execution returns { product, movements, total_movements }
 * — the use case batches the repo calls in one Promise.all so the page only
 * pays one network round trip in latency terms.
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import type { ProductDTO } from "@application/dtos/ProductDTO";
import type { StockLevelDTO, StockMovementDTO } from "@application/dtos/StockDTO";
import { ProductMapper } from "@application/mappers/ProductMapper";
import { StockMapper } from "@application/mappers/StockMapper";
import { NotFoundException } from "@application/exceptions/ApplicationException";

export interface GetProductWithMovementsInputDTO {
  product_id: string;
  page?: number;
  limit?: number;
}

export interface GetProductWithMovementsResultDTO {
  product: ProductDTO;
  /** Current stock level (null when the product has never been stocked). */
  stockLevel: StockLevelDTO | null;
  movements: StockMovementDTO[];
  total_movements: number;
  page: number;
  limit: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export class GetProductWithMovementsUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly stockRepository: IStockRepository,
    private readonly categoryRepository: ICategoryRepository,
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(
    dto: GetProductWithMovementsInputDTO,
  ): Promise<GetProductWithMovementsResultDTO> {
    const page = Math.max(1, dto.page ?? DEFAULT_PAGE);
    const limit = Math.max(1, dto.limit ?? DEFAULT_LIMIT);
    const offset = (page - 1) * limit;

    const product = await this.productRepository.findById(dto.product_id);
    if (!product) {
      throw new NotFoundException("Product", dto.product_id);
    }

    const [category, supplier, stockLevel, movements, total_movements] =
      await Promise.all([
        product.categoryId
          ? this.categoryRepository.findById(product.categoryId)
          : Promise.resolve(null),
        product.supplierId
          ? this.supplierRepository.findById(product.supplierId)
          : Promise.resolve(null),
        this.stockRepository.findStockLevelByProductId(product.id),
        this.stockRepository.findMovements({
          productId: product.id,
          limit,
          offset,
        }),
        this.stockRepository.countMovements({ productId: product.id }),
      ]);

    return {
      product: ProductMapper.toDTO(product, category, supplier),
      stockLevel: stockLevel
        ? StockMapper.stockLevelToDTO(stockLevel, product.name, product.sku.value)
        : null,
      movements: movements.map((m) =>
        StockMapper.movementToDTO(m, product.name),
      ),
      total_movements,
      page,
      limit,
    };
  }
}
