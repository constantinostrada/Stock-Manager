/**
 * T29 — ImportProductsCsvUseCase.
 *
 * Covers:
 *   AC-3: preview classifies rows as valid/invalid (sku duplicado intra-archivo,
 *         precio no numérico, sku inválido, campos requeridos).
 *   AC-5: upsert by SKU; auto-create category/supplier by name.
 *   AC-6: ADJUSTMENT movement on quantity change.
 *   AC-7: parseo válido, error formato, dry-run no muta DB, commit muta.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ImportProductsCsvUseCase } from "@application/use-cases/product/ImportProductsCsvUseCase";
import { Product } from "@domain/entities/Product";
import { Category } from "@domain/entities/Category";
import { Supplier } from "@domain/entities/Supplier";
import { StockLevel } from "@domain/entities/StockLevel";
import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import { IMPORT_HEADER } from "@/lib/importProductsCsv";

const HEADER = IMPORT_HEADER.join(",");

function makeProduct(sku: string, name = "Existing"): Product {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return Product.create({
    id: `prod-${sku}`,
    name,
    description: null,
    sku: SKU.create(sku),
    price: Money.create(10),
    categoryId: null,
    supplierId: null,
    createdAt: now,
    updatedAt: now,
  });
}

function makeLevel(productId: string, quantity: number, minQuantity = 0): StockLevel {
  return StockLevel.create({
    id: `sl-${productId}`,
    productId,
    quantity,
    minQuantity,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });
}

function makeCategory(id: string, name: string): Category {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return Category.create({ id, name, createdAt: now, updatedAt: now });
}

function makeSupplier(id: string, name: string): Supplier {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return Supplier.create({
    id,
    name,
    email: null,
    phone: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  });
}

interface RepoSet {
  productRepo: IProductRepository;
  categoryRepo: ICategoryRepository;
  supplierRepo: ISupplierRepository;
  stockRepo: IStockRepository;
}

function setup(opts?: {
  existingProducts?: Product[];
  existingCategories?: Category[];
  existingSuppliers?: Supplier[];
  stockBySku?: Record<string, number>;
}): RepoSet {
  const productsBySku = new Map(
    (opts?.existingProducts ?? []).map((p) => [p.sku.value, p]),
  );
  const productsById = new Map(
    (opts?.existingProducts ?? []).map((p) => [p.id, p]),
  );
  const categoriesByName = new Map(
    (opts?.existingCategories ?? []).map((c) => [c.name, c]),
  );
  const suppliersByName = new Map(
    (opts?.existingSuppliers ?? []).map((s) => [s.name, s]),
  );
  const levelsByProductId = new Map<string, StockLevel>();
  for (const [sku, qty] of Object.entries(opts?.stockBySku ?? {})) {
    const product = productsBySku.get(sku);
    if (product) levelsByProductId.set(product.id, makeLevel(product.id, qty));
  }

  const productRepo: IProductRepository = {
    findById: vi.fn(async (id) => productsById.get(id) ?? null),
    findBySku: vi.fn(async (sku) => productsBySku.get(sku) ?? null),
    findAll: vi.fn(),
    save: vi.fn(async (p) => p),
    update: vi.fn(async (p) => p),
    delete: vi.fn(),
    deleteManyBySkus: vi.fn(),
    softDelete: vi.fn(),
    existsBySku: vi.fn(),
  };
  const categoryRepo: ICategoryRepository = {
    findById: vi.fn(),
    findByName: vi.fn(async (n) => categoriesByName.get(n) ?? null),
    findAll: vi.fn(),
    save: vi.fn(async (c) => c),
    delete: vi.fn(),
    existsByName: vi.fn(),
  };
  const supplierRepo: ISupplierRepository = {
    findById: vi.fn(),
    findByName: vi.fn(async (n) => suppliersByName.get(n) ?? null),
    findAll: vi.fn(),
    save: vi.fn(async (s) => s),
    update: vi.fn(),
    delete: vi.fn(),
    existsByName: vi.fn(),
  };
  const stockRepo: IStockRepository = {
    findStockLevelByProductId: vi.fn(async (pid) =>
      levelsByProductId.get(pid) ?? null,
    ),
    findAllStockLevels: vi.fn(),
    findLowStockLevels: vi.fn(),
    saveStockLevel: vi.fn(async (l) => l),
    findMovementById: vi.fn(),
    findMovements: vi.fn(),
    countMovements: vi.fn(),
    saveMovement: vi.fn(),
    applyMovement: vi.fn(async (l, m) => ({ stockLevel: l, movement: m })),
  };

  return { productRepo, categoryRepo, supplierRepo, stockRepo };
}

describe("ImportProductsCsvUseCase — T29", () => {
  let repos: RepoSet;
  let useCase: ImportProductsCsvUseCase;

  beforeEach(() => {
    repos = setup();
    useCase = new ImportProductsCsvUseCase(
      repos.productRepo,
      repos.categoryRepo,
      repos.supplierRepo,
      repos.stockRepo,
    );
  });

  it("AC-7: returns a fileError when the header is wrong (dry-run, no mutations)", async () => {
    const csv = "sku,nombre\nA,B";
    const result = await useCase.execute({ csvText: csv, mode: "dry-run" });
    expect(result.fileError).toMatch(/encabezado/i);
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual([]);
    expect(repos.productRepo.save).not.toHaveBeenCalled();
    expect(repos.productRepo.update).not.toHaveBeenCalled();
  });

  it("AC-7: dry-run does NOT mutate the DB even for fully-valid input", async () => {
    const csv = [
      HEADER,
      "SKU-01,Mouse,desc,25.5,Periféricos,Acme,10,2",
    ].join("\r\n");

    const result = await useCase.execute({ csvText: csv, mode: "dry-run" });

    expect(result.fileError).toBeNull();
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(0);
    expect(result.valid[0]!.action).toBe("create");
    // Strict: no writes during dry-run.
    expect(repos.productRepo.save).not.toHaveBeenCalled();
    expect(repos.productRepo.update).not.toHaveBeenCalled();
    expect(repos.categoryRepo.save).not.toHaveBeenCalled();
    expect(repos.supplierRepo.save).not.toHaveBeenCalled();
    expect(repos.stockRepo.saveStockLevel).not.toHaveBeenCalled();
    expect(repos.stockRepo.applyMovement).not.toHaveBeenCalled();
  });

  it("AC-3: flags rows with non-numeric price", async () => {
    const csv = [
      HEADER,
      "SKU-01,Mouse,,abc,Cat,Sup,5,1",
    ].join("\n");
    const result = await useCase.execute({ csvText: csv, mode: "dry-run" });
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0]!.errors.join(" | ")).toMatch(/precio.*numérico/i);
  });

  it("AC-3: flags duplicate SKUs within the same CSV file", async () => {
    const csv = [
      HEADER,
      "SKU-01,A,,10,,,1,0",
      "SKU-01,B,,11,,,2,0",
    ].join("\n");
    const result = await useCase.execute({ csvText: csv, mode: "dry-run" });
    // First row is fine; second one carries the duplicate-SKU error.
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0]!.rowNumber).toBe(3);
    expect(result.invalid[0]!.errors.join(" | ")).toMatch(/duplicado/i);
  });

  it("AC-5: commit creates a new product when the SKU does not exist", async () => {
    const csv = [
      HEADER,
      "SKU-NEW,Cable,desc,5.5,,,3,1",
    ].join("\n");
    const result = await useCase.execute({ csvText: csv, mode: "commit" });
    expect(result.summary.createdCount).toBe(1);
    expect(result.summary.updatedCount).toBe(0);
    expect(repos.productRepo.save).toHaveBeenCalledTimes(1);
    expect(repos.productRepo.update).not.toHaveBeenCalled();
    // A new product gets a seeded stock level with quantity=3; NO movement
    // is recorded for the genesis level (matches CreateProductUseCase).
    expect(repos.stockRepo.saveStockLevel).toHaveBeenCalledTimes(1);
    expect(repos.stockRepo.applyMovement).not.toHaveBeenCalled();
  });

  it("AC-5: commit updates an existing product (upsert) when the SKU exists", async () => {
    const existing = makeProduct("SKU-01");
    repos = setup({
      existingProducts: [existing],
      stockBySku: { "SKU-01": 5 },
    });
    useCase = new ImportProductsCsvUseCase(
      repos.productRepo,
      repos.categoryRepo,
      repos.supplierRepo,
      repos.stockRepo,
    );
    const csv = [
      HEADER,
      "SKU-01,Updated name,new desc,99,,,5,0",
    ].join("\n");
    const result = await useCase.execute({ csvText: csv, mode: "commit" });
    expect(result.summary.updatedCount).toBe(1);
    expect(result.summary.createdCount).toBe(0);
    expect(repos.productRepo.update).toHaveBeenCalledTimes(1);
    expect(repos.productRepo.save).not.toHaveBeenCalled();
  });

  it("AC-5: auto-creates a category by name when it doesn't exist", async () => {
    const csv = [
      HEADER,
      "SKU-01,A,,1,Brand New Category,,1,0",
    ].join("\n");
    await useCase.execute({ csvText: csv, mode: "commit" });
    expect(repos.categoryRepo.save).toHaveBeenCalledTimes(1);
    const saved = (repos.categoryRepo.save as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect(saved.name).toBe("Brand New Category");
  });

  it("AC-5: auto-creates a supplier by name when it doesn't exist", async () => {
    const csv = [
      HEADER,
      "SKU-01,A,,1,,Brand New Supplier,1,0",
    ].join("\n");
    await useCase.execute({ csvText: csv, mode: "commit" });
    expect(repos.supplierRepo.save).toHaveBeenCalledTimes(1);
    const saved = (repos.supplierRepo.save as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect(saved.name).toBe("Brand New Supplier");
  });

  it("AC-5: reuses an existing category/supplier (no duplicate auto-create)", async () => {
    const cat = makeCategory("c1", "Existing");
    const sup = makeSupplier("s1", "Existing");
    repos = setup({
      existingCategories: [cat],
      existingSuppliers: [sup],
    });
    useCase = new ImportProductsCsvUseCase(
      repos.productRepo,
      repos.categoryRepo,
      repos.supplierRepo,
      repos.stockRepo,
    );
    const csv = [
      HEADER,
      "SKU-01,A,,1,Existing,Existing,1,0",
    ].join("\n");
    await useCase.execute({ csvText: csv, mode: "commit" });
    expect(repos.categoryRepo.save).not.toHaveBeenCalled();
    expect(repos.supplierRepo.save).not.toHaveBeenCalled();
  });

  it("AC-6: logs an ADJUSTMENT movement when an existing product's quantity changes", async () => {
    const existing = makeProduct("SKU-01");
    repos = setup({
      existingProducts: [existing],
      stockBySku: { "SKU-01": 5 },
    });
    useCase = new ImportProductsCsvUseCase(
      repos.productRepo,
      repos.categoryRepo,
      repos.supplierRepo,
      repos.stockRepo,
    );
    const csv = [
      HEADER,
      "SKU-01,Updated,desc,10,,,42,0", // quantity goes from 5 → 42
    ].join("\n");

    const result = await useCase.execute({ csvText: csv, mode: "commit" });

    expect(result.summary.movementsLogged).toBe(1);
    expect(repos.stockRepo.applyMovement).toHaveBeenCalledTimes(1);
    const [, movement] = (repos.stockRepo.applyMovement as ReturnType<
      typeof vi.fn
    >).mock.calls[0]!;
    expect(movement.type.value).toBe("ADJUSTMENT");
    expect(movement.quantity).toBe(42);
  });

  it("AC-6: does NOT log a movement if the quantity is unchanged on update", async () => {
    const existing = makeProduct("SKU-01");
    repos = setup({
      existingProducts: [existing],
      stockBySku: { "SKU-01": 7 },
    });
    useCase = new ImportProductsCsvUseCase(
      repos.productRepo,
      repos.categoryRepo,
      repos.supplierRepo,
      repos.stockRepo,
    );
    const csv = [
      HEADER,
      "SKU-01,Same qty,desc,10,,,7,0",
    ].join("\n");

    const result = await useCase.execute({ csvText: csv, mode: "commit" });

    expect(result.summary.updatedCount).toBe(1);
    expect(result.summary.movementsLogged).toBe(0);
    expect(repos.stockRepo.applyMovement).not.toHaveBeenCalled();
  });

  it("AC-7: commit mutates the DB and returns a populated summary", async () => {
    const csv = [
      HEADER,
      "SKU-01,New,desc,5.5,Cat,Sup,3,1",
      "SKU-02,New2,,6,,,4,1",
    ].join("\n");

    const result = await useCase.execute({ csvText: csv, mode: "commit" });

    expect(result.summary).toEqual({
      totalRows: 2,
      validCount: 2,
      invalidCount: 0,
      createdCount: 2,
      updatedCount: 0,
      movementsLogged: 0,
    });
    expect(repos.productRepo.save).toHaveBeenCalledTimes(2);
    expect(repos.stockRepo.saveStockLevel).toHaveBeenCalledTimes(2);
  });
});
