/**
 * PriceChange Entity
 *
 * Represents an immutable audit record of a product price change.
 * One record per actual change — equal prices never produce a record.
 *
 * LAYER: domain — zero external imports allowed.
 */

import { DomainException } from "@domain/exceptions/DomainException";

export interface PriceChangeProps {
  id: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  changedAt: Date;
}

export class PriceChange {
  readonly id: string;
  readonly productId: string;
  readonly oldPrice: number;
  readonly newPrice: number;
  readonly changedAt: Date;

  private constructor(props: PriceChangeProps) {
    this.id = props.id;
    this.productId = props.productId;
    this.oldPrice = props.oldPrice;
    this.newPrice = props.newPrice;
    this.changedAt = props.changedAt;
  }

  static create(props: PriceChangeProps): PriceChange {
    if (!props.id || props.id.trim().length === 0) {
      throw new DomainException("PriceChange id must not be empty.");
    }
    if (!props.productId || props.productId.trim().length === 0) {
      throw new DomainException("PriceChange productId must not be empty.");
    }
    if (!Number.isFinite(props.oldPrice) || props.oldPrice < 0) {
      throw new DomainException("PriceChange oldPrice must be a non-negative finite number.");
    }
    if (!Number.isFinite(props.newPrice) || props.newPrice < 0) {
      throw new DomainException("PriceChange newPrice must be a non-negative finite number.");
    }
    if (props.oldPrice === props.newPrice) {
      throw new DomainException("PriceChange requires the price to actually change.");
    }
    return new PriceChange(props);
  }

  /**
   * Percent delta relative to the old price ((new - old) / old * 100).
   * `null` when the old price was 0 (delta is undefined).
   */
  get deltaPercent(): number | null {
    if (this.oldPrice === 0) return null;
    return ((this.newPrice - this.oldPrice) / this.oldPrice) * 100;
  }

  get isIncrease(): boolean {
    return this.newPrice > this.oldPrice;
  }

  equals(other: PriceChange): boolean {
    return this.id === other.id;
  }
}
