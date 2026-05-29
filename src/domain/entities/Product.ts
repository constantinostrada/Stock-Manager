/**
 * Product Entity
 *
 * Core domain entity representing a product in the stock management system.
 * Protects its own invariants via constructor validation.
 *
 * LAYER: domain — zero external imports allowed.
 */

import { SKU } from "@domain/value-objects/SKU";
import { Money } from "@domain/value-objects/Money";
import { DomainException } from "@domain/exceptions/DomainException";

export interface ProductProps {
  id: string;
  name: string;
  description: string | null;
  sku: SKU;
  price: Money;
  categoryId: string | null;
  supplierId: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Soft-delete tombstone. `null` while the product is active. */
  deletedAt?: Date | null;
}

export class Product {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly sku: SKU;
  readonly price: Money;
  readonly categoryId: string | null;
  readonly supplierId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;

  private constructor(props: ProductProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.sku = props.sku;
    this.price = props.price;
    this.categoryId = props.categoryId;
    this.supplierId = props.supplierId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt ?? null;
  }

  static create(props: ProductProps): Product {
    if (!props.id || props.id.trim().length === 0) {
      throw new DomainException("Product id must not be empty.");
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new DomainException("Product name must not be empty.");
    }
    if (props.name.trim().length > 200) {
      throw new DomainException("Product name must not exceed 200 characters.");
    }
    if (props.description !== null && props.description.length > 1000) {
      throw new DomainException("Product description must not exceed 1000 characters.");
    }
    return new Product({
      ...props,
      name: props.name.trim(),
      description: props.description?.trim() ?? null,
    });
  }

  /** Returns a new Product with updated fields (immutable update pattern). */
  update(fields: Partial<Pick<ProductProps, "name" | "description" | "price" | "categoryId" | "supplierId">>): Product {
    return Product.create({
      ...this,
      ...fields,
      updatedAt: new Date(),
    });
  }

  /**
   * Marks the product as soft-deleted by stamping `deletedAt` with the current
   * time. Returns a new Product instance — the previous one is unchanged.
   * Movements and stock levels are NOT touched (that decision lives at the
   * application layer; the entity only carries the tombstone).
   */
  softDelete(at: Date = new Date()): Product {
    return Product.create({
      ...this,
      deletedAt: at,
      updatedAt: at,
    });
  }

  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  equals(other: Product): boolean {
    return this.id === other.id;
  }
}
