/**
 * Dependency Injection Container
 *
 * Wires up all use cases with their concrete repository implementations.
 * This is the only place in the codebase where infrastructure meets application.
 * Interfaces (controllers) import from here to get fully-constructed use cases.
 *
 * LAYER: infrastructure
 */

import { prisma } from "@infrastructure/database/prismaClient";

// ─── Repository implementations ──────────────────────────────────────────────
import { PrismaProductRepository } from "@infrastructure/repositories/PrismaProductRepository";
import { PrismaStockRepository } from "@infrastructure/repositories/PrismaStockRepository";
import { PrismaCategoryRepository } from "@infrastructure/repositories/PrismaCategoryRepository";
import { PrismaSupplierRepository } from "@infrastructure/repositories/PrismaSupplierRepository";

// ─── Use cases ───────────────────────────────────────────────────────────────
import { CreateProductUseCase } from "@application/use-cases/product/CreateProductUseCase";
import { GetProductUseCase } from "@application/use-cases/product/GetProductUseCase";
import { GetProductBySkuUseCase } from "@application/use-cases/product/GetProductBySkuUseCase";
import { GetProductWithMovementsUseCase } from "@application/use-cases/product/GetProductWithMovementsUseCase";
import { ListProductsUseCase } from "@application/use-cases/product/ListProductsUseCase";
import { ExportProductsCsvUseCase } from "@application/use-cases/product/ExportProductsCsvUseCase";
import { UpdateProductUseCase } from "@application/use-cases/product/UpdateProductUseCase";
import { DeleteProductUseCase } from "@application/use-cases/product/DeleteProductUseCase";
import { DeleteProductsBulkUseCase } from "@application/use-cases/product/DeleteProductsBulkUseCase";
import { SoftDeleteProductUseCase } from "@application/use-cases/product/SoftDeleteProductUseCase";
import { AdjustStockUseCase } from "@application/use-cases/stock/AdjustStockUseCase";
import { GetStockLevelUseCase } from "@application/use-cases/stock/GetStockLevelUseCase";
import { ListStockLevelsUseCase } from "@application/use-cases/stock/ListStockLevelsUseCase";
import { ListStockMovementsUseCase } from "@application/use-cases/stock/ListStockMovementsUseCase";
import { GetStockSummaryUseCase } from "@application/use-cases/stock/GetStockSummaryUseCase";
import { CreateCategoryUseCase } from "@application/use-cases/category/CreateCategoryUseCase";
import { ListCategoriesUseCase } from "@application/use-cases/category/ListCategoriesUseCase";
import { DeleteCategoryUseCase } from "@application/use-cases/category/DeleteCategoryUseCase";
import { CreateSupplierUseCase } from "@application/use-cases/supplier/CreateSupplierUseCase";
import { ListSuppliersUseCase } from "@application/use-cases/supplier/ListSuppliersUseCase";
import { UpdateSupplierUseCase } from "@application/use-cases/supplier/UpdateSupplierUseCase";
import { DeleteSupplierUseCase } from "@application/use-cases/supplier/DeleteSupplierUseCase";
import { GetInventoryDashboardUseCase } from "@application/use-cases/dashboard/GetInventoryDashboardUseCase";

// ─── Instantiate repositories ─────────────────────────────────────────────────
const productRepository = new PrismaProductRepository(prisma);
const stockRepository = new PrismaStockRepository(prisma);
const categoryRepository = new PrismaCategoryRepository(prisma);
const supplierRepository = new PrismaSupplierRepository(prisma);

// ─── Instantiate use cases (exported for use in interfaces/) ──────────────────
export const createProductUseCase = new CreateProductUseCase(
  productRepository,
  stockRepository,
  categoryRepository,
  supplierRepository,
);
export const getProductUseCase = new GetProductUseCase(productRepository, categoryRepository);
export const getProductBySkuUseCase = new GetProductBySkuUseCase(
  productRepository,
  stockRepository,
  categoryRepository,
);
export const getProductWithMovementsUseCase = new GetProductWithMovementsUseCase(
  productRepository,
  stockRepository,
  categoryRepository,
  supplierRepository,
);
export const listProductsUseCase = new ListProductsUseCase(
  productRepository,
  categoryRepository,
  supplierRepository,
);
export const exportProductsCsvUseCase = new ExportProductsCsvUseCase(
  productRepository,
  stockRepository,
  supplierRepository,
);
export const updateProductUseCase = new UpdateProductUseCase(
  productRepository,
  categoryRepository,
  supplierRepository,
);
export const deleteProductUseCase = new DeleteProductUseCase(productRepository);
export const softDeleteProductUseCase = new SoftDeleteProductUseCase(
  productRepository,
);
export const deleteProductsBulkUseCase = new DeleteProductsBulkUseCase(
  productRepository,
);

export const adjustStockUseCase = new AdjustStockUseCase(productRepository, stockRepository);
export const getStockLevelUseCase = new GetStockLevelUseCase(productRepository, stockRepository);
export const listStockLevelsUseCase = new ListStockLevelsUseCase(productRepository, stockRepository);
export const listStockMovementsUseCase = new ListStockMovementsUseCase(
  productRepository,
  stockRepository,
);
export const getStockSummaryUseCase = new GetStockSummaryUseCase(productRepository, stockRepository);

export const createCategoryUseCase = new CreateCategoryUseCase(categoryRepository);
export const listCategoriesUseCase = new ListCategoriesUseCase(categoryRepository);
export const deleteCategoryUseCase = new DeleteCategoryUseCase(categoryRepository);

export const createSupplierUseCase = new CreateSupplierUseCase(supplierRepository);
export const listSuppliersUseCase = new ListSuppliersUseCase(supplierRepository);
export const updateSupplierUseCase = new UpdateSupplierUseCase(supplierRepository);
export const deleteSupplierUseCase = new DeleteSupplierUseCase(supplierRepository);

export const getInventoryDashboardUseCase = new GetInventoryDashboardUseCase(
  productRepository,
  stockRepository,
);
