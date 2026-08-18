#!/usr/bin/env node
// Spike 01 — Manifest schema parse
// Goal: prove a module manifest can be parsed and validated with a small JSON schema.
// Run: node research/phase-zero/spike-01-manifest-schema-parse.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = path.join(root, "templates", "MODULE_MANIFEST_TEMPLATE.json");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// Minimal validation rules reflecting architecture/MODULE_SYSTEM.md
const required = [
  "schemaVersion",
  "id",
  "version",
  "displayName",
  "description",
  "engine",
  "starters",
  "requires",
  "conflicts",
  "capabilities",
  "files",
  "generatedContributions",
  "packages",
  "environment",
  "migrations",
  "verification",
  "documentation",
];

const missing = required.filter((k) => !(k in manifest));
if (missing.length > 0) {
  console.error("FAIL: missing keys", missing);
  process.exit(1);
}

if (!/^[a-z][a-z0-9-]*$/.test(manifest.id)) {
  console.error("FAIL: id must be kebab-case", manifest.id);
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
  console.error("FAIL: version must be semver-ish", manifest.version);
  process.exit(1);
}

console.log("PASS: manifest schema parse", { id: manifest.id, version: manifest.version });
