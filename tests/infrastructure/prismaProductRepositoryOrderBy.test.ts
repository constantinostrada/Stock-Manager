/**
 * T27 — PrismaProductRepository.findAll applies ORDER BY based on the
 * `sort` ProductFilters field.
 *
 * AC: "Tests: ... repo aplica orderBy" + "Visual/contract: sort por
 * name|price|stock con dirección asc|desc".
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PrismaProductRepository } from "@infrastructure/repositories/PrismaProductRepository";

function makePrismaMock() {
  const queryRawUnsafe = vi.fn(async () => [] as unknown[]);
  const prisma = { $queryRawUnsafe: queryRawUnsafe };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { prisma: prisma as any, queryRawUnsafe };
}

describe("PrismaProductRepository.findAll — T27 ORDER BY", () => {
  let prisma: ReturnType<typeof makePrismaMock>["prisma"];
  let queryRawUnsafe: ReturnType<typeof makePrismaMock>["queryRawUnsafe"];

  beforeEach(() => {
    const m = makePrismaMock();
    prisma = m.prisma;
    queryRawUnsafe = m.queryRawUnsafe;
  });

  it("defaults to ORDER BY createdAt DESC when no sort is given", async () => {
    const repo = new PrismaProductRepository(prisma);
    await repo.findAll();
    const [sql] = queryRawUnsafe.mock.calls[0]!;
    expect(sql).toMatch(/ORDER BY "createdAt" DESC/);
  });

  it("sort by name asc emits ORDER BY LOWER(\"name\") ASC", async () => {
    const repo = new PrismaProductRepository(prisma);
    await repo.findAll({ sort: { field: "name", direction: "asc" } });
    const [sql] = queryRawUnsafe.mock.calls[0]!;
    expect(sql).toMatch(/ORDER BY LOWER\("name"\) ASC/);
  });

  it("sort by name desc emits ORDER BY LOWER(\"name\") DESC", async () => {
    const repo = new PrismaProductRepository(prisma);
    await repo.findAll({ sort: { field: "name", direction: "desc" } });
    const [sql] = queryRawUnsafe.mock.calls[0]!;
    expect(sql).toMatch(/ORDER BY LOWER\("name"\) DESC/);
  });

  it("sort by price asc emits ORDER BY \"price\" ASC", async () => {
    const repo = new PrismaProductRepository(prisma);
    await repo.findAll({ sort: { field: "price", direction: "asc" } });
    const [sql] = queryRawUnsafe.mock.calls[0]!;
    expect(sql).toMatch(/ORDER BY "price" ASC/);
  });

  it("sort by price desc emits ORDER BY \"price\" DESC", async () => {
    const repo = new PrismaProductRepository(prisma);
    await repo.findAll({ sort: { field: "price", direction: "desc" } });
    const [sql] = queryRawUnsafe.mock.calls[0]!;
    expect(sql).toMatch(/ORDER BY "price" DESC/);
  });

  it("sort by stock asc LEFT JOINs StockLevel and orders by sl.quantity ASC", async () => {
    const repo = new PrismaProductRepository(prisma);
    await repo.findAll({ sort: { field: "stock", direction: "asc" } });
    const [sql] = queryRawUnsafe.mock.calls[0]!;
    expect(sql).toMatch(/LEFT JOIN "StockLevel" sl ON sl\."productId" = p\."id"/);
    expect(sql).toMatch(/ORDER BY COALESCE\(sl\."quantity", 0\) ASC/);
    // Still excludes soft-deleted rows
    expect(sql).toMatch(/p\."deletedAt" IS NULL/);
  });

  it("sort by stock desc orders DESC", async () => {
    const repo = new PrismaProductRepository(prisma);
    await repo.findAll({ sort: { field: "stock", direction: "desc" } });
    const [sql] = queryRawUnsafe.mock.calls[0]!;
    expect(sql).toMatch(/ORDER BY COALESCE\(sl\."quantity", 0\) DESC/);
  });

  it("combines sort with name + supplier filters (raw params still parameterised)", async () => {
    const repo = new PrismaProductRepository(prisma);
    await repo.findAll({
      name: "mouse",
      supplierId: "sup-acme",
      sort: { field: "price", direction: "desc" },
    });
    const [sql, ...params] = queryRawUnsafe.mock.calls[0]!;
    expect(sql).toMatch(/ORDER BY "price" DESC/);
    expect(sql).toMatch(/LOWER\("name"\) LIKE LOWER\(\?\)/);
    expect(sql).toMatch(/"supplierId" = \?/);
    expect(params).toEqual(["%mouse%", "sup-acme"]);
  });

  it("stock sort with filters keeps soft-delete filter + binds the same params", async () => {
    const repo = new PrismaProductRepository(prisma);
    await repo.findAll({
      name: "mouse",
      categoryId: "cat-1",
      sort: { field: "stock", direction: "asc" },
    });
    const [sql, ...params] = queryRawUnsafe.mock.calls[0]!;
    expect(sql).toMatch(/p\."deletedAt" IS NULL/);
    expect(sql).toMatch(/LOWER\(p\."name"\) LIKE LOWER\(\?\)/);
    expect(sql).toMatch(/p\."categoryId" = \?/);
    expect(params).toEqual(["%mouse%", "cat-1"]);
  });
});
