import Database from 'better-sqlite3';

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta?: { duration: number; last_row_id: number; changes: number };
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  bind(values: Record<string, unknown>): D1Statement;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(): Promise<T | null>;
  raw<T = unknown>(): Promise<T[]>;
  run(): Promise<D1Result>;
}

export interface D1Mock {
  prepare(query: string): D1Statement;
  exec(query: string): void;
  batch(statements: D1Statement[]): Promise<D1Result[]>;
}

class BetterSqliteStatement implements D1Statement {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly statement: any;

  private values: unknown[] = [];
  private namedValues: Record<string, unknown> | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(statement: any) {
    this.statement = statement;
  }

  bind(...args: unknown[]): D1Statement {
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      this.namedValues = args[0] as Record<string, unknown>;
      this.values = [];
    } else {
      this.values = args;
      this.namedValues = undefined;
    }
    return this;
  }

  all<T = unknown>(): Promise<D1Result<T>> {
    const results = this.namedValues
      ? (this.statement.all(this.namedValues) as T[])
      : (this.statement.all(...this.values) as T[]);
    return Promise.resolve({
      results: (results ?? []) as T[],
      success: true,
      meta: { duration: 0, last_row_id: 0, changes: 0 },
    });
  }

  first<T = unknown>(): Promise<T | null> {
    const row = this.namedValues
      ? (this.statement.get(this.namedValues) as T | undefined)
      : (this.statement.get(...this.values) as T | undefined);
    return Promise.resolve((row ?? null) as T | null);
  }

  raw<T = unknown>(): Promise<T[]> {
    const rows = this.namedValues
      ? (this.statement.all(this.namedValues) as Record<string, unknown>[])
      : (this.statement.all(...this.values) as Record<string, unknown>[]);
    const values = (rows ?? []).map((row) => Object.values(row) as T);
    return Promise.resolve(values);
  }

  run(): Promise<D1Result> {
    const result = this.namedValues
      ? this.statement.run(this.namedValues)
      : this.statement.run(...this.values);
    return Promise.resolve({
      results: [],
      success: true,
      meta: {
        duration: 0,
        last_row_id: (result?.lastInsertRowid as number) ?? 0,
        changes: (result?.changes as number) ?? 0,
      },
    });
  }
}

export function createD1Database(): D1Mock {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = new (Database as any)(':memory:');

  return {
    prepare(query: string): D1Statement {
      const statement = db.prepare(query);
      return new BetterSqliteStatement(statement);
    },
    exec(query: string): void {
      db.exec(query);
    },
    batch(statements: D1Statement[]): Promise<D1Result[]> {
      const results: D1Result[] = [];
      for (const statement of statements) {
        results.push(statement.run() as unknown as D1Result);
      }
      return Promise.resolve(results);
    },
  } as unknown as D1Mock;
}
