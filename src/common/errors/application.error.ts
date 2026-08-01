import { IApplicationErrorOptions } from '../types/application-error-options';

export abstract class ApplicationError extends Error {
  readonly statusCode: number;
  readonly error: string;
  readonly code: string;
  readonly details?: unknown;

  protected constructor(options: IApplicationErrorOptions) {
    super(options.message);

    this.name = new.target.name;
    this.statusCode = options.statusCode;
    this.error = options.error;
    this.code = options.code;
    this.details = options.details;

    Error.captureStackTrace?.(this, new.target);
  }
}
