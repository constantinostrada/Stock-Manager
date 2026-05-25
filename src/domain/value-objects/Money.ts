/**
 * Money Value Object
 *
 * Represents a monetary amount with a currency code.
 * Immutable — arithmetic returns new instances.
 *
 * LAYER: domain — zero external imports allowed.
 */

import { DomainException } from "@domain/exceptions/DomainException";

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export class Money {
  private readonly _amount: number;
  private readonly _currency: string;

  private constructor(amount: number, currency: string) {
    this._amount = amount;
    this._currency = currency;
  }

  static create(amount: number, currency = "USD"): Money {
    if (!Number.isFinite(amount)) {
      throw new DomainException("Money amount must be a finite number.");
    }
    if (amount < 0) {
      throw new DomainException("Money amount cannot be negative.");
    }
    const normalisedCurrency = currency.trim().toUpperCase();
    if (!CURRENCY_PATTERN.test(normalisedCurrency)) {
      throw new DomainException(
        `Currency code "${currency}" is invalid. Must be a 3-letter ISO 4217 code.`,
      );
    }
    // Round to 2 decimal places to avoid floating-point drift
    const rounded = Math.round(amount * 100) / 100;
    return new Money(rounded, normalisedCurrency);
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.create(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.create(this._amount - other._amount, this._currency);
  }

  multiply(factor: number): Money {
    if (!Number.isFinite(factor) || factor < 0) {
      throw new DomainException("Multiplication factor must be a non-negative finite number.");
    }
    return Money.create(this._amount * factor, this._currency);
  }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  toString(): string {
    return `${this._currency} ${this._amount.toFixed(2)}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new DomainException(
        `Currency mismatch: cannot operate on ${this._currency} and ${other._currency}.`,
      );
    }
  }
}
