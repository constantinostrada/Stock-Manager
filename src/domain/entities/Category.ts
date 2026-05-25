/**
 * Category Entity
 *
 * Represents a product category used for organisation and filtering.
 *
 * LAYER: domain — zero external imports allowed.
 */

import { DomainException } from "@domain/exceptions/DomainException";

export interface CategoryProps {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Category {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: CategoryProps) {
    this.id = props.id;
    this.name = props.name;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CategoryProps): Category {
    if (!props.id || props.id.trim().length === 0) {
      throw new DomainException("Category id must not be empty.");
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new DomainException("Category name must not be empty.");
    }
    if (props.name.trim().length > 100) {
      throw new DomainException("Category name must not exceed 100 characters.");
    }
    return new Category({ ...props, name: props.name.trim() });
  }

  rename(newName: string): Category {
    return Category.create({
      ...this,
      name: newName,
      updatedAt: new Date(),
    });
  }

  equals(other: Category): boolean {
    return this.id === other.id;
  }
}
