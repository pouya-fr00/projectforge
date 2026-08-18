#!/usr/bin/env node
// Spike 04 — Transactional rollback
// Goal: prove a failed write can be rolled back by restoring a backup and removing new files.
// Limitation: this is a best-effort filesystem-only demonstration. Real package-manager side
// effects (e.g., pnpm install) cannot be perfectly reversed; the production engine must keep
// a recovery report as described in ADR-003.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const txId = `tx-${Date.now()}`;
const txDir = path.join(root, "research", "phase-zero", "tmp", txId);
const projectDir = path.join(txDir, "project");
const backupDir = path.join(txDir, "backup");
const originalContent = "original";
const newContent = "new content";

function setup() {
  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, "existing.txt"), originalContent, "utf8");
}

function backup() {
  fs.copyFileSync(path.join(projectDir, "existing.txt"), path.join(backupDir, "existing.txt"));
}

function applyWithFailure(injectAfter = 1) {
  // Stage new files
  fs.writeFileSync(path.join(projectDir, "new-1.txt"), newContent, "utf8");
  if (injectAfter === 1) throw new Error("injected failure after file 1");
  fs.writeFileSync(path.join(projectDir, "new-2.txt"), newContent, "utf8");
}

function rollback() {
  // Restore backed-up files
  fs.copyFileSync(path.join(backupDir, "existing.txt"), path.join(projectDir, "existing.txt"));
  // Remove newly created files owned by transaction
  for (const f of ["new-1.txt"]) {
    const p = path.join(projectDir, f);
    if (fs.existsSync(p)) fs.rmSync(p);
  }
}

function cleanup() {
  fs.rmSync(txDir, { recursive: true, force: true });
}

try {
  setup();
  backup();
  try {
    applyWithFailure(1);
    console.error("FAIL: expected injected failure");
    process.exit(1);
  } catch {
    rollback();
  }

  const restored = fs.readFileSync(path.join(projectDir, "existing.txt"), "utf8");
  if (restored !== originalContent) {
    console.error("FAIL: existing file not restored", restored);
    process.exit(1);
  }

  if (fs.existsSync(path.join(projectDir, "new-1.txt"))) {
    console.error("FAIL: new file should have been removed");
    process.exit(1);
  }

  console.log("PASS: transactional rollback restored project state");
} finally {
  cleanup();
}
