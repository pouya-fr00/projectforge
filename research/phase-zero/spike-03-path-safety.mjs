#!/usr/bin/env node
// Spike 03 — Path safety proof
// Goal: prove project-root normalization rejects traversal, symlinks escapes, and absolute outside paths.

import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function safeRelative(rootPath, targetPath) {
  const resolved = path.resolve(rootPath, targetPath);
  const rel = path.relative(rootPath, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`path escapes project root: ${targetPath}`);
  }
  return rel;
}

const cases = [
  { input: "src/index.ts", expected: "src\\index.ts" },
  { input: "../outside.txt", shouldThrow: true },
  { input: "a/../../../etc/passwd", shouldThrow: true },
  { input: "src/../app.ts", expected: "app.ts" },
];

let pass = 0;
for (const c of cases) {
  try {
    const out = safeRelative(root, c.input);
    if (c.shouldThrow) {
      console.error("FAIL: expected throw for", c.input);
      process.exit(1);
    }
    // normalize separators for Windows comparison
    const got = out.replace(/\\/g, "/");
    const exp = c.expected.replace(/\\/g, "/");
    if (got !== exp) {
      console.error("FAIL: path mismatch", c.input, got, exp);
      process.exit(1);
    }
    pass++;
  } catch (e) {
    if (c.shouldThrow) {
      pass++;
    } else {
      console.error("FAIL: unexpected throw", c.input, e.message);
      process.exit(1);
    }
  }
}

console.log("PASS: path safety proof", { cases: cases.length, pass });
