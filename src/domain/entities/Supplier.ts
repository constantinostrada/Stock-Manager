/**
 * Supplier Entity
 *
 * Represents a supplier (proveedor) that may later be associated with products.
 *
 * LAYER: domain — zero external imports allowed.
 */

import { DomainException } from "@domain/exceptions/DomainException";

export interface SupplierProps {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Supplier {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: SupplierProps) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.phone = props.phone;
    this.notes = props.notes;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: SupplierProps): Supplier {
    if (!props.id || props.id.trim().length === 0) {
      throw new DomainException("Supplier id must not be empty.");
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new DomainException("Supplier name must not be empty.");
    }
    if (props.name.trim().length > 200) {
      throw new DomainException("Supplier name must not exceed 200 characters.");
    }

    const email = Supplier.normaliseOptional(props.email);
    if (email !== null && email.length > 200) {
      throw new DomainException("Supplier email must not exceed 200 characters.");
    }

    const phone = Supplier.normaliseOptional(props.phone);
    if (phone !== null && phone.length > 30) {
      throw new DomainException("Supplier phone must not exceed 30 characters.");
    }

    const notes = Supplier.normaliseOptional(props.notes);
    if (notes !== null && notes.length > 1000) {
      throw new DomainException("Supplier notes must not exceed 1000 characters.");
    }

    return new Supplier({
      ...props,
      name: props.name.trim(),
      email,
      phone,
      notes,
    });
  }

  equals(other: Supplier): boolean {
    return this.id === other.id;
  }

  private static normaliseOptional(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
}
