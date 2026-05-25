/**
 * StockMovement Entity
 *
 * Represents an immutable audit record of a stock change (in, out, adjustment).
 *
 * LAYER: domain — zero external imports allowed.
 */

import { DomainException } from "@domain/exceptions/DomainException";
import { MovementType } from "@domain/value-objects/MovementType";

export interface StockMovementProps {
  id: string;
  productId: string;
  type: MovementType;
  quantity: number;
  reason: string | null;
  reference: string | null;
  createdAt: Date;
}

export class StockMovement {
  readonly id: string;
  readonly productId: string;
  readonly type: MovementType;
  readonly quantity: number;
  readonly reason: string | null;
  readonly reference: string | null;
  readonly createdAt: Date;

  private constructor(props: StockMovementProps) {
    this.id = props.id;
    this.productId = props.productId;
    this.type = props.type;
    this.quantity = props.quantity;
    this.reason = props.reason;
    this.reference = props.reference;
    this.createdAt = props.createdAt;
  }

  static create(props: StockMovementProps): StockMovement {
    if (props.quantity <= 0) {
      throw new DomainException("Stock movement quantity must be greater than zero.");
    }
    if (props.reason !== null && props.reason.length > 500) {
      throw new DomainException("Movement reason must not exceed 500 characters.");
    }
    return new StockMovement(props);
  }

  equals(other: StockMovement): boolean {
    return this.id === other.id;
  }
}
