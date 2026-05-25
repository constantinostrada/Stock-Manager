/**
 * SKU Value Object
 *
 * A Stock Keeping Unit — an immutable alphanumeric product identifier.
 * Equality is determined by value, not reference.
 *
 * LAYER: domain — zero external imports allowed.
 */

import { DomainException } from "@domain/exceptions/DomainException";

/** Pattern: 2–10 uppercase alphanumeric characters, optionally separated by hyphens. */
const SKU_PATTERN = /^[A-Z0-9]{2,10}(-[A-Z0-9]{2,10})*$/;

export class SKU {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): SKU {
    if (!value || value.trim().length === 0) {
      throw new DomainException("SKU must not be empty.");
    }
    const normalised = value.trim().toUpperCase();
    if (!SKU_PATTERN.test(normalised)) {
      throw new DomainException(
        `SKU "${value}" is invalid. Must be 2–10 uppercase alphanumeric characters, ` +
          `optionally separated by hyphens (e.g. PROD-001).`,
      );
    }
    return new SKU(normalised);
  }

  get value(): string {
    return this._value;
  }

  equals(other: SKU): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
