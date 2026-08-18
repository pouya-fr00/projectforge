#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

// Ensure the database is created inside the generated project root,
// not wherever `node` happens to be executed from.  The migrations
// directory lives under <project>/migrations/, so the project root is
// its parent directory.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let dbPath;
const rawUrl = process.env.DATABASE_URL;
if (rawUrl) {
  // Reject unsupported URI formats (e.g. `postgres://…`, `libsql://…`)
  // that would be silently misinterpreted by node:sqlite as a file path.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(rawUrl) && !rawUrl.startsWith('file:')) {
    console.error(
      'DATABASE_URL is an unsupported protocol.  node:sqlite only accepts',
      'filesystem paths or `file:` URIs.  Got:', rawUrl,
    );
    process.exit(1);
  }
  // Resolve relative paths against the generated project root, not CWD.
  dbPath = path.isAbsolute(rawUrl) ? rawUrl : path.resolve(projectRoot, rawUrl);
} else {
  dbPath = path.join(projectRoot, 'local.db');
}
// node:sqlite requires the parent directory to exist.
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new DatabaseSync(dbPath);

const migrationsDir = path.dirname(fileURLToPath(import.meta.url));

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  db.exec(sql);
}

console.log(`Applied ${files.length} migration(s) to ${dbPath}`);
