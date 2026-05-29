/**
 * T28 — ExportProductsCsvUseCase
 *
 *  • Builds a CSV with columns Nombre/Precio/Stock/Proveedor/Creado.
 *  • Escapes commas, quotes and newlines per RFC 4180.
 *  • Prefixes the content with a UTF-8 BOM and uses CRLF line endings.
 *  • Returns the filename produced by csvFilenameFor for the injected clock.
 */
import { describe, expect, it, vi } from "vitest";
import { ExportProductsCsvUseCase } from "@application/use-cases/product/ExportProductsCsvUseCase";
import { Product } from "@domain/entities/Product";
import { StockLevel } from "@domain/entities/StockLevel";
import { Supplier } from "@domain/entities/Supplier";
import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";
import { CSV_BOM } from "@/lib/exportProductsCsv";
import type { IProductRepository } from "@domain/repositories/IProductRepository";
import type { IStockRepository } from "@domain/repositories/IStockRepository";
import type { ISupplierRepository } from "@domain/repositories/ISupplierRepository";

const CREATED_AT = new Date("2026-04-21T10:15:30.000Z");

function makeProduct(opts: {
  id: string;
  name: string;
  price: number;
  supplierId?: string | null;
}): Product {
  return Product.create({
    id: opts.id,
    name: opts.name,
    description: null,
    sku: SKU.create(`SKU-${opts.id}`),
    price: Money.create(opts.price),
    categoryId: null,
    supplierId: opts.supplierId ?? null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
}

function makeSupplier(id: string, name: string): Supplier {
  return Supplier.create({
    id,
    name,
    email: null,
    phone: null,
    notes: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
}

function makeStockLevel(productId: string, qty: number): StockLevel {
  return StockLevel.create({
    id: `sl-${productId}`,
    productId,
    quantity: qty,
    minQuantity: 0,
    updatedAt: CREATED_AT,
  });
}

function setup(opts: {
  products: Product[];
  suppliers?: Supplier[];
  stockByProductId?: Record<string, number>;
  now?: () => Date;
}) {
  const productRepo: IProductRepository = {
    findById: vi.fn(),
    findBySku: vi.fn(),
    findAll: vi.fn().mockResolvedValue(opts.products),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteManyBySkus: vi.fn(),
    softDelete: vi.fn(),
    existsBySku: vi.fn(),
  };
  const supplierById = new Map(
    (opts.suppliers ?? []).map((s) => [s.id, s]),
  );
  const supplierRepo: ISupplierRepository = {
    findById: vi.fn().mockImplementation(async (id: string) =>
      supplierById.get(id) ?? null,
    ),
    findByName: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    existsByName: vi.fn(),
  };
  const stockLevels = Object.entries(opts.stockByProductId ?? {}).map(
    ([productId, qty]) => makeStockLevel(productId, qty),
  );
  const stockRepo: IStockRepository = {
    findStockLevelByProductId: vi.fn(),
    findAllStockLevels: vi.fn().mockResolvedValue(stockLevels),
    findLowStockLevels: vi.fn(),
    saveStockLevel: vi.fn(),
    findMovementById: vi.fn(),
    findMovements: vi.fn(),
    countMovements: vi.fn(),
    saveMovement: vi.fn(),
    applyMovement: vi.fn(),
  };
  const useCase = new ExportProductsCsvUseCase(
    productRepo,
    stockRepo,
    supplierRepo,
    opts.now,
  );
  return { useCase, productRepo, supplierRepo, stockRepo };
}

describe("ExportProductsCsvUseCase — T28", () => {
  it("returns a CSV with the T28 header line in the right order", async () => {
    const { useCase } = setup({ products: [] });
    const { content } = await useCase.execute();
    const lines = content.slice(CSV_BOM.length).split("\r\n");
    expect(lines[0]).toBe("Nombre,Precio,Stock,Proveedor,Creado");
  });

  it("prefixes content with the UTF-8 BOM and joins rows with CRLF", async () => {
    const { useCase } = setup({
      products: [makeProduct({ id: "p1", name: "Mouse", price: 25.5 })],
      stockByProductId: { p1: 12 },
    });
    const { content } = await useCase.execute();
    expect(content.charCodeAt(0)).toBe(0xfeff);
    // Single row plus header → exactly one CRLF separator.
    const occurrences = content.split("\r\n").length - 1;
    expect(occurrences).toBe(1);
  });

  it("renders columns in order: name, price (2dp), stock, supplier name, ISO createdAt", async () => {
    const acme = makeSupplier("sup-acme", "Acme S.A.");
    const product = makeProduct({
      id: "p1",
      name: "Mouse",
      price: 25.5,
      supplierId: "sup-acme",
    });
    const { useCase } = setup({
      products: [product],
      suppliers: [acme],
      stockByProductId: { p1: 12 },
    });
    const { content } = await useCase.execute();
    const lines = content.slice(CSV_BOM.length).split("\r\n");
    expect(lines[1]).toBe(
      `Mouse,25.50,12,Acme S.A.,${CREATED_AT.toISOString()}`,
    );
  });

  it("RFC 4180 — escapes names that contain commas (wraps in double quotes)", async () => {
    const product = makeProduct({
      id: "p1",
      name: "Mouse, gamer",
      price: 10,
    });
    const { useCase } = setup({
      products: [product],
      stockByProductId: { p1: 1 },
    });
    const { content } = await useCase.execute();
    const lines = content.slice(CSV_BOM.length).split("\r\n");
    expect(lines[1]).toBe(
      `"Mouse, gamer",10.00,1,,${CREATED_AT.toISOString()}`,
    );
  });

  it('RFC 4180 — escapes embedded double quotes by doubling them', async () => {
    const product = makeProduct({
      id: "p1",
      name: 'Monitor 27"',
      price: 300,
    });
    const { useCase } = setup({
      products: [product],
      stockByProductId: { p1: 0 },
    });
    const { content } = await useCase.execute();
    const lines = content.slice(CSV_BOM.length).split("\r\n");
    expect(lines[1]).toBe(
      `"Monitor 27""",300.00,0,,${CREATED_AT.toISOString()}`,
    );
  });

  it("leaves a missing supplier column blank (no Proveedor → empty cell)", async () => {
    const product = makeProduct({ id: "p1", name: "Cable", price: 5 });
    const { useCase } = setup({
      products: [product],
      stockByProductId: { p1: 4 },
    });
    const { content } = await useCase.execute();
    const lines = content.slice(CSV_BOM.length).split("\r\n");
    expect(lines[1]).toBe(`Cable,5.00,4,,${CREATED_AT.toISOString()}`);
  });

  it("missing stock for a product defaults to 0", async () => {
    const product = makeProduct({ id: "p1", name: "Hub", price: 12 });
    const { useCase } = setup({ products: [product] });
    const { content } = await useCase.execute();
    const lines = content.slice(CSV_BOM.length).split("\r\n");
    expect(lines[1]).toBe(`Hub,12.00,0,,${CREATED_AT.toISOString()}`);
  });

  it("forwards `name` and `sort` filters to the product repository — and NOT page/limit", async () => {
    const { useCase, productRepo } = setup({ products: [] });
    await useCase.execute({
      name: "mouse",
      sort: { field: "price", direction: "desc" },
    });
    expect(productRepo.findAll).toHaveBeenCalledTimes(1);
    const call = (productRepo.findAll as unknown as ReturnType<typeof vi.fn>)
      .mock.calls[0]![0];
    expect(call).toEqual({
      name: "mouse",
      sort: { field: "price", direction: "desc" },
    });
    expect(call).not.toHaveProperty("page");
    expect(call).not.toHaveProperty("limit");
  });

  it("returns the filename produced by csvFilenameFor for the injected clock", async () => {
    const fixedNow = new Date(2026, 4, 26, 8, 7); // 2026-05-26 08:07 local
    const { useCase } = setup({ products: [], now: () => fixedNow });
    const { filename } = await useCase.execute();
    expect(filename).toBe("products-2026-05-26-0807.csv");
  });
});
