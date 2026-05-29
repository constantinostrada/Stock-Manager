/**
 * T26 — PrismaProductRepository.findAll excludes soft-deleted rows by default.
 *
 * AC: "IProductRepository.list filtra deleted_at IS NULL por default".
 *
 * Implementation note (T26): findAll is dispatched through `$queryRawUnsafe`
 * with a parameterised WHERE clause that always contains `"deletedAt" IS NULL`.
 * This indirection exists so the filter does NOT depend on the cached
 * `@prisma/client` schema validator knowing about `deletedAt`. The test
 * asserts the generated SQL string and parameters.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PrismaProductRepository } from "@infrastructure/repositories/PrismaProductRepository";

function makePrismaMock() {
  const queryRawUnsafe = vi.fn(async () => [] as unknown[]);
  const prisma = {
    $queryRawUnsafe: queryRawUnsafe,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { prisma: prisma as any, queryRawUnsafe };
}

describe("PrismaProductRepository.findAll — T26 soft-delete exclusion", () => {
  let prisma: ReturnType<typeof makePrismaMock>["prisma"];
  let queryRawUnsafe: ReturnType<typeof makePrismaMock>["queryRawUnsafe"];

  beforeEach(() => {
    const m = makePrismaMock();
    prisma = m.prisma;
    queryRawUnsafe = m.queryRawUnsafe;
  });

  it('always emits `"deletedAt" IS NULL` in the SQL WHERE clause, even with no filters', async () => {
    const repo = new PrismaProductRepository(prisma);

    await repo.findAll();

    expect(queryRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql, ...params] = queryRawUnsafe.mock.calls[0]!;
    expect(typeof sql).toBe("string");
    expect(sql).toMatch(/"deletedAt"\s+IS\s+NULL/);
    expect(params).toEqual([]);
  });

  it("keeps the soft-delete filter even when name/category/supplier filters are also supplied", async () => {
    const repo = new PrismaProductRepository(prisma);

    await repo.findAll({
      name: "mouse",
      categoryId: "cat-1",
      supplierId: "sup-1",
    });

    const [sql, ...params] = queryRawUnsafe.mock.calls[0]!;
    expect(sql).toMatch(/"deletedAt"\s+IS\s+NULL/);
    expect(sql).toMatch(/"categoryId"\s*=\s*\?/);
    expect(sql).toMatch(/"supplierId"\s*=\s*\?/);
    expect(sql).toMatch(/LOWER\("name"\)\s+LIKE\s+LOWER\(\?\)/);
    expect(params).toEqual(["%mouse%", "cat-1", "sup-1"]);
  });
});
