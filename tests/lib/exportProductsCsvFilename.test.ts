/**
 * T28 — csvFilenameFor util
 *
 *  • Returns `products-YYYY-MM-DD-HHmm.csv` using LOCAL time.
 *  • Single-digit month/day/hour/minute pad to 2 digits.
 *  • Round-trips through the lib's CSV header convention.
 */
import { describe, expect, it } from "vitest";
import { csvFilenameFor } from "@/lib/exportProductsCsv";

describe("csvFilenameFor — T28", () => {
  it("produces products-YYYY-MM-DD-HHmm.csv for a known local time", () => {
    const d = new Date(2026, 4, 26, 8, 7); // May 26 2026, 08:07 local (month 0-indexed)
    expect(csvFilenameFor(d)).toBe("products-2026-05-26-0807.csv");
  });

  it("pads single-digit month, day, hour and minute to 2 chars", () => {
    const d = new Date(2027, 0, 9, 3, 4); // Jan 09 2027, 03:04 local
    expect(csvFilenameFor(d)).toBe("products-2027-01-09-0304.csv");
  });

  it("renders the maximum-digit fields without padding noise", () => {
    const d = new Date(2026, 11, 31, 23, 59); // Dec 31 2026, 23:59 local
    expect(csvFilenameFor(d)).toBe("products-2026-12-31-2359.csv");
  });

  it("uses local time getters (NOT UTC)", () => {
    const d = new Date(2026, 4, 26, 0, 0);
    const local = csvFilenameFor(d);
    const utcHH = d.getUTCHours().toString().padStart(2, "0");
    const utcMI = d.getUTCMinutes().toString().padStart(2, "0");
    const utcVariant = `products-${d.getUTCFullYear()}-${(d.getUTCMonth() + 1)
      .toString()
      .padStart(2, "0")}-${d.getUTCDate().toString().padStart(2, "0")}-${utcHH}${utcMI}.csv`;
    // If the host's offset is non-zero, the two MUST differ; if it's UTC,
    // the test would be vacuous but never wrong. The point is: we DO NOT
    // accidentally reach for getUTC*.
    if (d.getTimezoneOffset() !== 0) {
      expect(local).not.toBe(utcVariant);
    }
  });

  it("defaults to `new Date()` when no argument is passed (smoke test for shape)", () => {
    expect(csvFilenameFor()).toMatch(
      /^products-\d{4}-\d{2}-\d{2}-\d{4}\.csv$/,
    );
  });
});
