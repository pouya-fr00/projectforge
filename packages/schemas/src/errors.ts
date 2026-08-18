/**
 * Stable, structured, JSON-serializable error model.
 *
 * All Project Factory errors share a stable `code`, a human-readable `message`,
 * and a `details` record that can be rendered as JSON by the CLI.
 */

export class ProjectFactoryError extends Error {
  public readonly code: string;
  public readonly details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ProjectFactoryError';
    this.code = code;
    this.details = details;
  }

  toJSON(): Record<string, unknown> {
    // Ensure details are always JSON-serializable by round-tripping through JSON.
    // Non-serializable values are dropped, which is acceptable for CLI output.
    let safeDetails: Record<string, unknown>;
    try {
      safeDetails = JSON.parse(JSON.stringify(this.details)) as Record<string, unknown>;
    } catch {
      safeDetails = { serializationFailed: true };
    }

    return {
      error: true,
      name: this.name,
      code: this.code,
      message: this.message,
      details: safeDetails,
    };
  }
}

export const PathErrorCodes = {
  PATH_ESCAPE: 'PF_PATH_ESCAPE',
  INVALID_PATH: 'PF_INVALID_PATH',
} as const;

export const SchemaErrorCodes = {
  SCHEMA_INVALID: 'PF_SCHEMA_INVALID',
} as const;

export class SchemaValidationError extends ProjectFactoryError {
  constructor(
    public readonly field: string,
    public readonly reason: string,
    public readonly value: unknown
  ) {
    super(
      SchemaErrorCodes.SCHEMA_INVALID,
      `${field}: ${reason}`,
      { field, reason, value }
    );
    this.name = 'SchemaValidationError';
  }
}
