/**
 * CSV import — ImportProductsUseCase
 *
 *  • dryRun: true validates rows and writes nothing.
 *  • dryRun: false creates the valid products (with stock level) and skips
 *    the invalid ones.
 *  • Flags: missing name, invalid SKU, duplicate SKU in file, duplicate SKU
 *    in DB, bad price/stock, unknown category/supplier.
 */
import { describe, expect, it, vi } from "vitest";
import { ImportProductsUseCase } from "@application/use-cases/product/ImportProductsUseCase";
import { Category } from "@domain/entities/Category";
import { Supplier } from "@domain/entities/Supplier";
import type { Product } from "@domain/entities/Product";
import type { StockLevel } from "@domain/entities/StockLevel";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import type { ImportProductRowInputDTO } from "@application/dtos/ProductDTO";

const NOW = new Date("2026-04-21T10:15:30.000Z");

function makeRow(
  overrides: Partial<ImportProductRowInputDTO> = {},
): ImportProductRowInputDTO {
  return {
    rowNumber: 2,
    name: "Mouse",
    sku: "MOU-001",
    price: "25.50",
    categoryName: "",
    supplierName: "",
    stock: "",
    minStock: "",
    ...overrides,
  };
}

function setup(opts: {
  existingSkus?: string[];
  categories?: string[];
  suppliers?: string[];
} = {}) {
  const existing = new Set(opts.existingSkus ?? []);
  const savedProducts: Product[] = [];
  const savedStockLevels: StockLevel[] = [];

  const productRepo: IProductRepository = {
    findById: vi.fn(),
    findBySku: vi.fn(),
    findAll: vi.fn(),
    findAllDeleted: vi.fn(),
    save: vi.fn().mockImplementation(async (p: Product) => {
      savedProducts.push(p);
      return p;
    }),
    update: vi.fn(),
    delete: vi.fn(),
    deleteManyBySkus: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    countDeleted: vi.fn(),
    existsBySku: vi
      .fn()
      .mockImplementation(async (sku: string) => existing.has(sku)),
  };
  const stockRepo: IStockRepository = {
    findStockLevelByProductId: vi.fn(),
    findAllStockLevels: vi.fn(),
    findLowStockLevels: vi.fn(),
    saveStockLevel: vi.fn().mockImplementation(async (sl: StockLevel) => {
      savedStockLevels.push(sl);
      return sl;
    }),
    findMovementById: vi.fn(),
    findMovements: vi.fn(),
    countMovements: vi.fn(),
    saveMovement: vi.fn(),
    applyMovement: vi.fn(),
  };
  const categoryRepo: ICategoryRepository = {
    findById: vi.fn(),
    findByName: vi.fn(),
    findAll: vi.fn().mockResolvedValue(
      (opts.categories ?? []).map((name, i) =>
        Category.create({
          id: `cat-${i}`,
          name,
          createdAt: NOW,
          updatedAt: NOW,
        }),
      ),
    ),
    save: vi.fn(),
    delete: vi.fn(),
    existsByName: vi.fn(),
  };
  const supplierRepo: ISupplierRepository = {
    findById: vi.fn(),
    findByName: vi.fn(),
    findAll: vi.fn().mockResolvedValue(
      (opts.suppliers ?? []).map((name, i) =>
        Supplier.create({
          id: `sup-${i}`,
          name,
          email: null,
          phone: null,
          notes: null,
          createdAt: NOW,
          updatedAt: NOW,
        }),
      ),
    ),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    existsByName: vi.fn(),
  };

  const useCase = new ImportProductsUseCase(
    productRepo,
    stockRepo,
    categoryRepo,
    supplierRepo,
  );
  return { useCase, productRepo, stockRepo, savedProducts, savedStockLevels };
}

describe("ImportProductsUseCase — preview (dryRun)", () => {
  it("marks valid rows and writes nothing", async () => {
    const { useCase, savedProducts, savedStockLevels } = setup();
    const result = await useCase.execute({
      rows: [makeRow()],
      dryRun: true,
    });
    expect(result.rows[0]).toMatchObject({ valid: true, errors: [] });
    expect(result.validCount).toBe(1);
    expect(result.errorCount).toBe(0);
    expect(result.createdCount).toBe(0);
    expect(savedProducts).toHaveLength(0);
    expect(savedStockLevels).toHaveLength(0);
  });

  it("flags a missing name", async () => {
    const { useCase } = setup();
    const result = await useCase.execute({
      rows: [makeRow({ name: "   " })],
      dryRun: true,
    });
    expect(result.rows[0]!.valid).toBe(false);
    expect(result.rows[0]!.errors).toContain("El nombre es requerido.");
  });

  it("flags an invalid and an empty SKU", async () => {
    const { useCase } = setup();
    const result = await useCase.execute({
      rows: [
        makeRow({ sku: "not a sku!!" }),
        makeRow({ rowNumber: 3, sku: "" }),
      ],
      dryRun: true,
    });
    expect(result.rows[0]!.errors[0]).toMatch(/SKU es inválido/);
    expect(result.rows[1]!.errors).toContain("El SKU es requerido.");
  });

  it("flags duplicate SKUs within the file (first occurrence stays valid)", async () => {
    const { useCase } = setup();
    const result = await useCase.execute({
      rows: [
        makeRow({ sku: "MOU-001" }),
        makeRow({ rowNumber: 3, name: "Mouse 2", sku: "mou-001" }), // SKU normalises to uppercase
      ],
      dryRun: true,
    });
    expect(result.rows[0]!.valid).toBe(true);
    expect(result.rows[1]!.valid).toBe(false);
    expect(result.rows[1]!.errors).toContain("SKU duplicado en el archivo.");
  });

  it("flags SKUs that already exist in the catalogue", async () => {
    const { useCase } = setup({ existingSkus: ["MOU-001"] });
    const result = await useCase.execute({
      rows: [makeRow({ sku: "MOU-001" })],
      dryRun: true,
    });
    expect(result.rows[0]!.valid).toBe(false);
    expect(result.rows[0]!.errors).toContain("El SKU ya existe en el catálogo.");
  });

  it("flags missing, non-numeric and non-positive prices", async () => {
    const { useCase } = setup();
    const result = await useCase.execute({
      rows: [
        makeRow({ price: "" }),
        makeRow({ rowNumber: 3, sku: "A-01", price: "abc" }),
        makeRow({ rowNumber: 4, sku: "A-02", price: "0" }),
      ],
      dryRun: true,
    });
    expect(result.rows[0]!.errors).toContain("El precio es requerido.");
    expect(result.rows[1]!.errors).toContain(
      "El precio debe ser un número mayor a 0.",
    );
    expect(result.rows[2]!.errors).toContain(
      "El precio debe ser un número mayor a 0.",
    );
  });

  it("flags negative or non-integer stock and min stock", async () => {
    const { useCase } = setup();
    const result = await useCase.execute({
      rows: [makeRow({ stock: "-1", minStock: "2.5" })],
      dryRun: true,
    });
    expect(result.rows[0]!.errors).toContain(
      "El stock debe ser un número entero mayor o igual a 0.",
    );
    expect(result.rows[0]!.errors).toContain(
      "El stock mínimo debe ser un número entero mayor o igual a 0.",
    );
  });

  it("resolves category and supplier by name (case-insensitive) and flags unknowns", async () => {
    const { useCase } = setup({
      categories: ["Periféricos"],
      suppliers: ["Acme"],
    });
    const result = await useCase.execute({
      rows: [
        makeRow({ categoryName: "periféricos", supplierName: "ACME" }),
        makeRow({
          rowNumber: 3,
          sku: "OTRO-01",
          categoryName: "Inexistente",
          supplierName: "Nadie",
        }),
      ],
      dryRun: true,
    });
    expect(result.rows[0]!.valid).toBe(true);
    expect(result.rows[1]!.errors).toContain('La categoría "Inexistente" no existe.');
    expect(result.rows[1]!.errors).toContain('El proveedor "Nadie" no existe.');
  });

  it("accumulates multiple errors on the same row", async () => {
    const { useCase } = setup();
    const result = await useCase.execute({
      rows: [makeRow({ name: "", sku: "x", price: "-3" })],
      dryRun: true,
    });
    expect(result.rows[0]!.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe("ImportProductsUseCase — commit", () => {
  it("creates the valid rows (product + stock level) and skips the invalid ones", async () => {
    const { useCase, savedProducts, savedStockLevels } = setup({
      existingSkus: ["DUP-DB"],
    });
    const result = await useCase.execute({
      rows: [
        makeRow({ sku: "MOU-001", stock: "12", minStock: "3" }),
        makeRow({ rowNumber: 3, name: "", sku: "TEC-001" }), // invalid: no name
        makeRow({ rowNumber: 4, name: "Otro", sku: "DUP-DB" }), // invalid: in DB
      ],
      dryRun: false,
    });

    expect(result.createdCount).toBe(1);
    expect(result.validCount).toBe(1);
    expect(result.errorCount).toBe(2);

    expect(savedProducts).toHaveLength(1);
    expect(savedProducts[0]!.sku.value).toBe("MOU-001");
    expect(savedProducts[0]!.name).toBe("Mouse");
    expect(savedProducts[0]!.price.amount).toBe(25.5);

    expect(savedStockLevels).toHaveLength(1);
    expect(savedStockLevels[0]!.productId).toBe(savedProducts[0]!.id);
    expect(savedStockLevels[0]!.quantity).toBe(12);
    expect(savedStockLevels[0]!.minQuantity).toBe(3);
  });

  it("defaults stock and min stock to 0 when the cells are empty", async () => {
    const { useCase, savedStockLevels } = setup();
    await useCase.execute({ rows: [makeRow()], dryRun: false });
    expect(savedStockLevels[0]!.quantity).toBe(0);
    expect(savedStockLevels[0]!.minQuantity).toBe(0);
  });

  it("links resolved category and supplier ids on the created product", async () => {
    const { useCase, savedProducts } = setup({
      categories: ["Periféricos"],
      suppliers: ["Acme"],
    });
    await useCase.execute({
      rows: [makeRow({ categoryName: "Periféricos", supplierName: "Acme" })],
      dryRun: false,
    });
    expect(savedProducts[0]!.categoryId).toBe("cat-0");
    expect(savedProducts[0]!.supplierId).toBe("sup-0");
  });
});
