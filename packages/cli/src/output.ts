export interface Output {
  print(text: string): void;
  table(rows: Record<string, string>[]): void;
  json(data: unknown): void;
  warn(text: string): void;
  error(err: unknown): void;
  flush(command: string, exitCode: number): void;
}

export interface OutputOptions {
  json: boolean;
  silent?: boolean;
  command?: string;
  sink?: (text: string) => void;
}

const ENVELOPE_SCHEMA_VERSION = 1;

function redactString(value: string): string {
  return value
    // Redact Authorization headers/schemes such as "Authorization: Bearer <token>".
    .replace(/(authorization\s*[:=]\s*(?:bearer\s+)?)(\S+)/gi, '$1[REDACTED]')
    // Redact key/value pairs for common secret-like tokens.
    .replace(/(password|secret|token|api[_-]?key|private[_-]?key|cookie|session)\s*[:=]\s*[^\s&]+/gi, '$1=[REDACTED]');
}

const SECRET_KEY_PATTERN = /(password|secret|token|api[_-]?key|private[_-]?key|cookie|session|credential|auth)/i;

export function redactSecrets(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => redactSecrets(v));
  }
  if (value !== null && typeof value === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        // Fully redact the value of any secret-like key, regardless of shape.
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSecrets(v);
      }
    }
    return redacted;
  }
  return value;
}

class HumanOutput implements Output {
  constructor(private readonly sink: (text: string) => void) {}

  print(text: string): void {
    this.sink(text);
  }

  table(rows: Record<string, string>[]): void {
    for (const row of rows) {
      const line = Object.entries(row)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');
      this.sink(line);
    }
  }

  json(data: unknown): void {
    this.sink(JSON.stringify(data, null, 2));
  }

  warn(text: string): void {
    this.sink(`Warning: ${text}`);
  }

  error(err: unknown): void {
    if (typeof err === 'object' && err !== null && 'toJSON' in err && typeof (err as { toJSON: () => unknown }).toJSON === 'function') {
      this.sink(JSON.stringify(redactSecrets((err as { toJSON: () => unknown }).toJSON()), null, 2));
    } else if (err instanceof Error) {
      this.sink(`Error: ${redactString(err.message)}`);
    } else {
      this.sink(`Error: ${redactString(String(err))}`);
    }
  }

  flush(): void {
    // Human output is emitted immediately; nothing to flush.
  }
}

class JsonOutput implements Output {
  private data: unknown | undefined;
  private readonly warnings: string[] = [];
  private readonly errors: unknown[] = [];

  constructor(private readonly sink: (text: string) => void, private readonly command: string) {}

  print(_text: string): void {
    // Human-only text is suppressed in JSON mode to keep output parseable.
  }

  table(_rows: Record<string, string>[]): void {
    // Table output is suppressed in JSON mode.
  }

  json(data: unknown): void {
    this.data = data;
  }

  warn(text: string): void {
    this.warnings.push(text);
  }

  error(err: unknown): void {
    this.errors.push(err);
  }

  flush(_command: string, exitCode: number): void {
    const safeErrors = this.errors.map((err) => {
      let normalized: unknown;
      if (typeof err === 'object' && err !== null && 'toJSON' in err && typeof (err as { toJSON: () => unknown }).toJSON === 'function') {
        normalized = (err as { toJSON: () => unknown }).toJSON();
      } else if (err instanceof Error) {
        normalized = { message: err.message };
      } else {
        normalized = { message: String(err) };
      }
      return redactSecrets(normalized);
    });

    const envelope = {
      schemaVersion: ENVELOPE_SCHEMA_VERSION,
      command: this.command,
      ok: exitCode === 0,
      data: this.data ?? null,
      warnings: this.warnings,
      errors: safeErrors,
    };

    this.sink(JSON.stringify(envelope));
  }
}

export function createOutput(options: OutputOptions): Output {
  const sink = options.sink ?? ((text: string) => console.log(text));
  if (options.json) {
    return new JsonOutput(sink, options.command ?? 'unknown');
  }
  return new HumanOutput(sink);
}
