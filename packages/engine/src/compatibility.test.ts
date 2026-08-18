import { describe, it, expect } from 'vitest';
import { isCompatible, ENGINE_VERSION } from './index.js';

describe('isCompatible', () => {
  it('accepts exact version match', () => {
    expect(isCompatible('0.1.0', '0.1.0')).toBe(true);
  });

  it('rejects exact version mismatch', () => {
    expect(isCompatible('0.2.0', '0.1.0')).toBe(false);
  });

  it('accepts >= range when version is greater', () => {
    expect(isCompatible('0.2.0', '>=0.1.0')).toBe(true);
  });

  it('rejects when version is below >= range', () => {
    expect(isCompatible('0.0.5', '>=0.1.0')).toBe(false);
  });

  it('accepts ^ range with same major and greater minor', () => {
    expect(isCompatible('0.2.0', '^0.1.0')).toBe(true);
  });

  it('rejects ^ range with different major', () => {
    expect(isCompatible('1.0.0', '^0.1.0')).toBe(false);
  });

  it('exports a non-empty engine version', () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
