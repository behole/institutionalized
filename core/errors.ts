// Typed error hierarchy for institutional-reasoning
// All framework errors must be traceable, machine-readable, and carry full context.

export const ErrorCode = {
  PROVIDER_RATE_LIMITED: "PROVIDER_RATE_LIMITED",
  PROVIDER_TIMEOUT: "PROVIDER_TIMEOUT",
  PROVIDER_API_ERROR: "PROVIDER_API_ERROR",
  VALIDATION_MISSING_INPUT: "VALIDATION_MISSING_INPUT",
  VALIDATION_INVALID_CONFIG: "VALIDATION_INVALID_CONFIG",
  FRAMEWORK_EXECUTION_FAILED: "FRAMEWORK_EXECUTION_FAILED",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ErrorContext {
  frameworkName?: string;
  agentName?: string;
  model?: string;
  prompt?: string;
}

export interface InstitutionalErrorOptions {
  code: ErrorCode;
  context: ErrorContext;
  cause?: unknown;
}

export class InstitutionalError extends Error {
  readonly code: ErrorCode;
  readonly context: ErrorContext;

  constructor(message: string, options: InstitutionalErrorOptions) {
    super(message, { cause: options.cause });
    this.code = options.code;
    this.context = options.context;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface ProviderErrorOptions {
  code: ErrorCode;
  context: ErrorContext;
  cause: unknown; // required — provider errors must always carry the upstream cause
}

export class ProviderError extends InstitutionalError {
  constructor(message: string, options: ProviderErrorOptions) {
    super(message, options);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends InstitutionalError {
  constructor(message: string, options: InstitutionalErrorOptions) {
    super(message, options);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class FrameworkError extends InstitutionalError {
  constructor(message: string, options: InstitutionalErrorOptions) {
    super(message, options);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
