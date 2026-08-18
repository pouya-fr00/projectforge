export const ExitCode = {
  SUCCESS: 0,
  PROJECT_ERROR: 1,
  USAGE_ERROR: 2,
  VERIFICATION_FAILURE: 3,
  ROLLBACK_FAILURE: 4,
  INTERNAL_DEFECT: 5,
} as const;

export interface ErrorExitMapping {
  exitCode: number;
  message: string;
}

export function mapErrorToExitCode(err: unknown): ErrorExitMapping {
  if (err instanceof Error) {
    const code = (err as { code?: string }).code;
    switch (code) {
      case 'PF_PROJECT_EXISTS':
      case 'PF_STARTER_NOT_FOUND':
      case 'PF_MODULE_NOT_FOUND':
      case 'PF_NOT_A_PROJECT':
      case 'PF_SCHEMA_INVALID':
      case 'PF_REGISTRY_INVALID_MANIFEST':
      case 'PF_REGISTRY_DUPLICATE_ID':
      case 'PF_REGISTRY_LOAD_FAILED':
      case 'PF_LOCK_INVALID':
      case 'PF_LOCK_READ_FAILED':
      case 'PF_LOCK_WRITE_FAILED':
      case 'PF_PROJECT_READ_FAILED':
      case 'PF_PROJECT_WRITE_FAILED':
      case 'PF_PATH_ESCAPE':
      case 'PF_INVALID_PATH':
      case 'PF_EXECUTION_FAILED':
      case 'PF_PROJECT_LOCKED':
      case 'PF_INCOMPATIBLE_VERSION':
      case 'PF_DUPLICATE_MIGRATION':
      case 'PF_CYCLIC_DEPENDENCY':
      case 'PF_MODULE_CONFLICT':
      case 'PF_DUPLICATE_MODULE':
      case 'PF_USER_MODIFIED_MANAGED_FILE':
        return { exitCode: ExitCode.PROJECT_ERROR, message: err.message };
      case 'PF_ROLLBACK_FAILED':
        return { exitCode: ExitCode.ROLLBACK_FAILURE, message: err.message };
      case 'PF_VERIFICATION_FAILED':
        return { exitCode: ExitCode.VERIFICATION_FAILURE, message: err.message };
      case 'PF_MISSING_ARGUMENT':
        return { exitCode: ExitCode.USAGE_ERROR, message: err.message };
      default:
        return { exitCode: ExitCode.INTERNAL_DEFECT, message: err.message };
    }
  }
  return { exitCode: ExitCode.INTERNAL_DEFECT, message: String(err) };
}
