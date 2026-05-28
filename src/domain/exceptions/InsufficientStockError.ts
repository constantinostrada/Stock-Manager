import { DomainException } from "./DomainException";

export class InsufficientStockError extends DomainException {
  readonly requested: number;
  readonly available: number;

  constructor(requested: number, available: number) {
    super(`Insufficient stock. Requested ${requested}, available ${available}.`);
    this.name = "InsufficientStockError";
    this.requested = requested;
    this.available = available;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
