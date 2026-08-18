#!/usr/bin/env node
// Spike 05 — Golden stack package availability check
// Goal: verify core V1 packages exist on the public npm registry without installing them.
// Run: node research/phase-zero/spike-05-golden-stack-check.mjs

import { execSync } from "node:child_process";

const packages = [
  "react",
  "react-dom",
  "vite",
  "hono",
  "@hono/node-server",
  "drizzle-orm",
  "drizzle-kit",
  "better-auth",
  "vitest",
  "typescript",
];

const results = {};
for (const pkg of packages) {
  try {
    const version = execSync(`npm view "${pkg}" version`, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    results[pkg] = { available: true, version };
  } catch (e) {
    results[pkg] = { available: false, error: e.message };
  }
}

const unavailable = Object.entries(results).filter(([, r]) => !r.available);
if (unavailable.length > 0) {
  console.error("FAIL: packages unavailable", unavailable);
  process.exit(1);
}

console.log("PASS: golden stack packages available", results);
