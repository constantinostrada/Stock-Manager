/**
 * GetProductBySkuUseCase
 *
 * Retrieves a product (by SKU) together with its current stock level and full
 * movement history. Used by the /products/[sku] detail page (T8).
 *
 * LAYER: application
 */

import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { ProductDTO } from "@application/dtos/ProductDTO";
import type { StockLevelDTO, StockMovementDTO } from "@application/dtos/StockDTO";
import { ProductMapper } from "@application/mappers/ProductMapper";
import { StockMapper } from "@application/mappers/StockMapper";
import { NotFoundException } from "@application/exceptions/ApplicationException";

export interface GetProductBySkuInputDTO {
  sku: string;
}

export interface GetProductBySkuResultDTO {
  product: ProductDTO;
  stockLevel: StockLevelDTO | null;
  movements: StockMovementDTO[];
}

export class GetProductBySkuUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly stockRepository: IStockRepository,
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(dto: GetProductBySkuInputDTO): Promise<GetProductBySkuResultDTO> {
    const product = await this.productRepository.findBySku(dto.sku);
    if (!product) {
      throw new NotFoundException("Product with sku", dto.sku);
    }

    const [category, stockLevel, movements] = await Promise.all([
      product.categoryId
        ? this.categoryRepository.findById(product.categoryId)
        : Promise.resolve(null),
      this.stockRepository.findStockLevelByProductId(product.id),
      this.stockRepository.findMovements({ productId: product.id }),
    ]);

    const productDTO = ProductMapper.toDTO(product, category);

    return {
      product: productDTO,
      stockLevel: stockLevel
        ? StockMapper.stockLevelToDTO(stockLevel, product.name, product.sku.value)
        : null,
      movements: movements.map((m) =>
        StockMapper.movementToDTO(m, product.name),
      ),
    };
  }
}
