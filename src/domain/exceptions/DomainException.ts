/**
 * DomainException
 *
 * Base exception for all domain rule violations.
 * Infrastructure and application layers catch this to translate
 * into appropriate user-facing error responses.
 *
 * LAYER: domain — zero external imports allowed.
 */
export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainException";
    // Restore prototype chain for proper instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
