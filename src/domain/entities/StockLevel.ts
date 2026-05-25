/**
 * StockLevel Entity
 *
 * Tracks the current quantity of a product in stock and enforces
 * stock-level invariants (e.g. quantity cannot go negative).
 *
 * LAYER: domain — zero external imports allowed.
 */

import { DomainException } from "@domain/exceptions/DomainException";

export interface StockLevelProps {
  id: string;
  productId: string;
  quantity: number;
  minQuantity: number;
  updatedAt: Date;
}

export class StockLevel {
  readonly id: string;
  readonly productId: string;
  readonly quantity: number;
  readonly minQuantity: number;
  readonly updatedAt: Date;

  private constructor(props: StockLevelProps) {
    this.id = props.id;
    this.productId = props.productId;
    this.quantity = props.quantity;
    this.minQuantity = props.minQuantity;
    this.updatedAt = props.updatedAt;
  }

  static create(props: StockLevelProps): StockLevel {
    if (props.quantity < 0) {
      throw new DomainException("Stock quantity cannot be negative.");
    }
    if (props.minQuantity < 0) {
      throw new DomainException("Minimum stock quantity cannot be negative.");
    }
    return new StockLevel(props);
  }

  /** True when stock is at or below the minimum threshold. */
  get isLowStock(): boolean {
    return this.quantity <= this.minQuantity;
  }

  /** True when the product is completely out of stock. */
  get isOutOfStock(): boolean {
    return this.quantity === 0;
  }

  /** Returns a new StockLevel after adding stock (immutable). */
  addStock(amount: number): StockLevel {
    if (amount <= 0) {
      throw new DomainException("Amount to add must be greater than zero.");
    }
    return StockLevel.create({
      ...this,
      quantity: this.quantity + amount,
      updatedAt: new Date(),
    });
  }

  /** Returns a new StockLevel after removing stock (immutable). */
  removeStock(amount: number): StockLevel {
    if (amount <= 0) {
      throw new DomainException("Amount to remove must be greater than zero.");
    }
    if (amount > this.quantity) {
      throw new DomainException(
        `Insufficient stock. Requested ${amount}, available ${this.quantity}.`,
      );
    }
    return StockLevel.create({
      ...this,
      quantity: this.quantity - amount,
      updatedAt: new Date(),
    });
  }

  /** Returns a new StockLevel with quantity set to an absolute value (adjustment). */
  adjustTo(newQuantity: number): StockLevel {
    if (newQuantity < 0) {
      throw new DomainException("Adjusted quantity cannot be negative.");
    }
    return StockLevel.create({
      ...this,
      quantity: newQuantity,
      updatedAt: new Date(),
    });
  }

  equals(other: StockLevel): boolean {
    return this.id === other.id;
  }
}
