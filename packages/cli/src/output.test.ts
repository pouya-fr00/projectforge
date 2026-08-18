import { describe, it, expect } from 'vitest';
import { createOutput, redactSecrets } from './output.js';
import { ProjectFactoryError } from '@projectforge/schemas';

describe('JsonOutput', () => {
  it('emits a single envelope with schemaVersion, command, ok, data, warnings, errors', () => {
    const lines: string[] = [];
    const out = createOutput({
      json: true,
      command: 'status',
      sink: (text) => lines.push(text),
    });

    out.json({ name: 'my-project' });
    out.warn('deprecated module');
    out.error(new Error('boom'));
    out.flush('status', 0);

    expect(lines).toHaveLength(1);
    const envelope = JSON.parse(lines[0]!);
    expect(envelope).toEqual({
      schemaVersion: 1,
      command: 'status',
      ok: true,
      data: { name: 'my-project' },
      warnings: ['deprecated module'],
      errors: [{ message: 'boom' }],
    });
  });

  it('reports ok:false when exit code is non-zero', () => {
    const lines: string[] = [];
    const out = createOutput({
      json: true,
      command: 'add',
      sink: (text) => lines.push(text),
    });
    out.flush('add', 1);
    const envelope = JSON.parse(lines[0]!);
    expect(envelope.ok).toBe(false);
  });

  it('redacts secrets from JSON error output', () => {
    const lines: string[] = [];
    const out = createOutput({
      json: true,
      command: 'add',
      sink: (text) => lines.push(text),
    });
    const err = new ProjectFactoryError('PF_EXECUTION_FAILED', 'package manager failed', {
      env: { BETTER_AUTH_SECRET: 'super-secret-value' },
    });
    out.error(err);
    out.flush('add', 1);
    const envelope = JSON.parse(lines[0]!);
    const message = JSON.stringify(envelope.errors);
    expect(message).not.toContain('super-secret-value');
    expect(message).toContain('[REDACTED]');
  });

  it('redacts secrets from human error output', () => {
    const lines: string[] = [];
    const out = createOutput({
      json: false,
      command: 'add',
      sink: (text) => lines.push(text),
    });
    out.error(new Error('BETTER_AUTH_SECRET=super-secret-value failed'));
    expect(lines[0]).not.toContain('super-secret-value');
    expect(lines[0]).toContain('BETTER_AUTH_SECRET=[REDACTED]');
  });

  it('redacts common secret-like patterns from strings', () => {
    expect(String(redactSecrets('password=secret123'))).toBe('password=[REDACTED]');
    expect(String(redactSecrets('api_key=abc123'))).toContain('[REDACTED]');
    expect(String(redactSecrets('Authorization: Bearer token-value'))).toContain('[REDACTED]');
    expect(String(redactSecrets('Authorization: Bearer token-value'))).not.toContain('token-value');
  });
});
