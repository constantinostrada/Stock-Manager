/**
 * MovementType Value Object
 *
 * Represents the direction/nature of a stock movement.
 *
 * LAYER: domain — zero external imports allowed.
 */

import { DomainException } from "@domain/exceptions/DomainException";

export type MovementTypeValue = "IN" | "OUT" | "ADJUSTMENT";

const VALID_TYPES: MovementTypeValue[] = ["IN", "OUT", "ADJUSTMENT"];

export class MovementType {
  private readonly _value: MovementTypeValue;

  private constructor(value: MovementTypeValue) {
    this._value = value;
  }

  static create(value: string): MovementType {
    const upper = value.trim().toUpperCase() as MovementTypeValue;
    if (!VALID_TYPES.includes(upper)) {
      throw new DomainException(
        `Movement type "${value}" is invalid. Must be one of: ${VALID_TYPES.join(", ")}.`,
      );
    }
    return new MovementType(upper);
  }

  static IN = new MovementType("IN");
  static OUT = new MovementType("OUT");
  static ADJUSTMENT = new MovementType("ADJUSTMENT");

  get value(): MovementTypeValue {
    return this._value;
  }

  /** Whether this movement increases stock. */
  get isInbound(): boolean {
    return this._value === "IN";
  }

  /** Whether this movement decreases stock. */
  get isOutbound(): boolean {
    return this._value === "OUT";
  }

  /** Whether this movement sets stock to an absolute value. */
  get isAdjustment(): boolean {
    return this._value === "ADJUSTMENT";
  }

  equals(other: MovementType): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
