/**
 * Action Helpers
 *
 * Utility types and functions for standardised Server Action responses.
 * Translates application/domain exceptions into user-facing error objects.
 *
 * LAYER: interfaces
 */

import { DomainException } from "@domain/exceptions/DomainException";
import {
  ApplicationException,
  NotFoundException,
  ConflictException,
  ValidationException,
} from "@application/exceptions/ApplicationException";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function err<T>(error: string, code = "UNKNOWN_ERROR"): ActionResult<T> {
  return { success: false, error, code };
}

/**
 * Wraps a use case call in a try/catch and normalises errors into ActionResult.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (error) {
    if (error instanceof NotFoundException) {
      return err(error.message, "NOT_FOUND");
    }
    if (error instanceof ConflictException) {
      return err(error.message, "CONFLICT");
    }
    if (error instanceof ValidationException) {
      return err(error.message, "VALIDATION_ERROR");
    }
    if (error instanceof ApplicationException) {
      return err(error.message, error.code);
    }
    if (error instanceof DomainException) {
      return err(error.message, "DOMAIN_ERROR");
    }
    // Unknown errors — don't leak internals
    console.error("[Server Action Error]", error);
    return err("An unexpected error occurred. Please try again.", "INTERNAL_ERROR");
  }
}
