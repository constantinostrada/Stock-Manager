/**
 * ApplicationException
 *
 * Base exception for application-layer errors (not found, conflict, etc.).
 * Controllers translate these into appropriate HTTP responses.
 *
 * LAYER: application
 */
export class ApplicationException extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ApplicationException";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundException extends ApplicationException {
  constructor(resource: string, id: string) {
    super(`${resource} with id "${id}" was not found.`, "NOT_FOUND");
    this.name = "NotFoundException";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConflictException extends ApplicationException {
  constructor(message: string) {
    super(message, "CONFLICT");
    this.name = "ConflictException";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationException extends ApplicationException {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationException";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
