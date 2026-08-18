import { describe, it, expect } from 'vitest';
import { mapErrorToExitCode, ExitCode } from './exit.js';
import { ProjectFactoryError } from '@projectforge/schemas';

describe('mapErrorToExitCode', () => {
  it('maps project errors to exit code 1', () => {
    const err = new ProjectFactoryError('PF_NOT_A_PROJECT', 'not a project');
    expect(mapErrorToExitCode(err).exitCode).toBe(ExitCode.PROJECT_ERROR);
  });

  it('maps missing argument to usage exit code 2', () => {
    const err = new ProjectFactoryError('PF_MISSING_ARGUMENT', 'missing arg');
    expect(mapErrorToExitCode(err).exitCode).toBe(ExitCode.USAGE_ERROR);
  });

  it('maps rollback failure to exit code 4', () => {
    const err = new ProjectFactoryError('PF_ROLLBACK_FAILED', 'rollback failed');
    expect(mapErrorToExitCode(err).exitCode).toBe(ExitCode.ROLLBACK_FAILURE);
  });

  it('maps verification failure to exit code 3', () => {
    const err = new ProjectFactoryError('PF_VERIFICATION_FAILED', 'verification failed');
    expect(mapErrorToExitCode(err).exitCode).toBe(ExitCode.VERIFICATION_FAILURE);
  });

  it('maps unknown errors to internal defect exit code 5', () => {
    const err = new ProjectFactoryError('PF_UNKNOWN', 'unknown');
    expect(mapErrorToExitCode(err).exitCode).toBe(ExitCode.INTERNAL_DEFECT);
  });
});
