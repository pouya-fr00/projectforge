/**
 * Policy-file validation tests.
 *
 * Verifies that required project policy files exist, contain no placeholder text,
 * preserve required attributions, and accurately reflect license/ownership status.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname ?? __dirname, '..', '..', '..');

function readFile(...segments: string[]): string {
  return fs.readFileSync(path.join(REPO_ROOT, ...segments), 'utf-8');
}

function fileExists(...segments: string[]): boolean {
  return fs.existsSync(path.join(REPO_ROOT, ...segments));
}

describe('policy files', () => {
  // ---- existence checks ----

  it('SECURITY.md exists', () => {
    expect(fileExists('SECURITY.md'), 'SECURITY.md must exist').toBe(true);
  });

  it('CONTRIBUTING.md exists', () => {
    expect(fileExists('CONTRIBUTING.md'), 'CONTRIBUTING.md must exist').toBe(true);
  });

  it('CODE_OF_CONDUCT.md exists', () => {
    expect(fileExists('CODE_OF_CONDUCT.md'), 'CODE_OF_CONDUCT.md must exist').toBe(true);
  });

  it('docs/THIRD_PARTY_LICENSES.md exists', () => {
    expect(fileExists('docs', 'THIRD_PARTY_LICENSES.md'), 'THIRD_PARTY_LICENSES.md must exist').toBe(true);
  });

  // ---- no hidden placeholders ----

  it('no [INSERT ...] placeholder in SECURITY.md', () => {
    const content = readFile('SECURITY.md');
    expect(content, 'SECURITY.md must not contain [INSERT ...] placeholder').not.toMatch(/\[INSERT[^\]]*\]/i);
  });

  it('no [INSERT ...] placeholder in CODE_OF_CONDUCT.md', () => {
    const content = readFile('CODE_OF_CONDUCT.md');
    expect(content, 'CODE_OF_CONDUCT.md must not contain [INSERT ...] placeholder').not.toMatch(/\[INSERT[^\]]*\]/i);
  });

  it('no [INSERT ...] placeholder in CONTRIBUTING.md', () => {
    const content = readFile('CONTRIBUTING.md');
    expect(content, 'CONTRIBUTING.md must not contain [INSERT ...] placeholder').not.toMatch(/\[INSERT[^\]]*\]/i);
  });

  // ---- Contributor Covenant attribution ----

  it('CODE_OF_CONDUCT.md preserves Contributor Covenant attribution', () => {
    const content = readFile('CODE_OF_CONDUCT.md');
    expect(content, 'must reference Contributor Covenant').toMatch(/Contributor Covenant/);
    expect(content, 'must contain attribution link').toMatch(/contributor-covenant\.org/);
    expect(content, 'must reference Mozilla enforcement ladder').toMatch(/mozilla\/diversity/);
  });

  it('CODE_OF_CONDUCT.md has an operational enforcement contact', () => {
    const content = readFile('CODE_OF_CONDUCT.md');
    expect(content, 'CODE_OF_CONDUCT.md must contain the operational contact email').toMatch(/pooya\.fr2005@gmail\.com/);
    expect(content, 'CODE_OF_CONDUCT.md must declare STATUS: OPERATIONAL').toMatch(/STATUS:\s*OPERATIONAL/);
    expect(content, 'CODE_OF_CONDUCT.md must state the contact is owner-controlled').toMatch(/controlled and monitored by the project owner/);
  });

  it('SECURITY.md has an operational vulnerability reporting contact', () => {
    const content = readFile('SECURITY.md');
    expect(content, 'SECURITY.md must contain the operational contact email').toMatch(/pooya\.fr2005@gmail\.com/);
    expect(content, 'SECURITY.md must declare STATUS: OPERATIONAL').toMatch(/STATUS:\s*OPERATIONAL/);
    expect(content, 'SECURITY.md must state the contact is owner-controlled').toMatch(/controlled and monitored by the project owner/);
  });

  // ---- license inventory accuracy ----

  it('docs/THIRD_PARTY_LICENSES.md records drizzle-orm as Apache-2.0', () => {
    const content = readFile('docs', 'THIRD_PARTY_LICENSES.md');
    expect(content, 'must record drizzle-orm as Apache-2.0').toMatch(/drizzle-orm.*Apache-2\.0/);
    // Must NOT claim drizzle-orm is MIT
    // Find the drizzle-orm row and verify it says Apache-2.0, not MIT
    const lines = content.split('\n');
    const drizzleLine = lines.find(l => l.includes('drizzle-orm'));
    if (drizzleLine) {
      expect(drizzleLine, `drizzle-orm line must contain Apache-2.0: "${drizzleLine.trim()}"`).toMatch(/Apache-2\.0/);
      expect(drizzleLine, `drizzle-orm line must NOT claim MIT: "${drizzleLine.trim()}"`).not.toMatch(/\| MIT \|/);
    }
  });

  it('docs/THIRD_PARTY_LICENSES.md explicitly lists no GPL/AGPL/BUSL/SSPL', () => {
    const content = readFile('docs', 'THIRD_PARTY_LICENSES.md');
    // The restricted-license block must exist
    expect(content, 'must list restricted license categories').toMatch(/GPL|AGPL|SSPL|BUSL/i);
  });

  // ---- NOTICE decision ----

  it('docs/THIRD_PARTY_LICENSES.md records that standalone NOTICE is not required', () => {
    const content = readFile('docs', 'THIRD_PARTY_LICENSES.md');
    expect(content, 'must document NOTICE/attribution decision').toMatch(/NOTICE.*not required|does not require.*NOTICE/i);
  });

  it('docs/THIRD_PARTY_LICENSES.md does not claim root MIT license covers dependency notices', () => {
    const content = readFile('docs', 'THIRD_PARTY_LICENSES.md');
    // Must NOT claim that the root MIT LICENSE satisfies all dependency notice requirements
    expect(content, 'must not claim root MIT LICENSE covers all dependency notices').not.toMatch(/MIT.*LICENSE.*covers|root.*LICENSE.*preserves.*dependency/i);
  });

  // ---- distribution boundaries ----

  it('docs/THIRD_PARTY_LICENSES.md documents what ProjectForge distributes vs does not', () => {
    const content = readFile('docs', 'THIRD_PARTY_LICENSES.md');
    expect(content, 'must document distribution boundaries').toMatch(/distribution.boundary|what.*distributes|does not distribute/i);
  });

  // ---- Snapshot integrity ----
  // This file must contain only assertions that hold in the public export
  // (no dependency on internal-only files or their absence).

  it('CODE_OF_CONDUCT.md no longer declares release-blocked status', () => {
    const content = readFile('CODE_OF_CONDUCT.md');
    expect(content, 'CODE_OF_CONDUCT.md must NOT claim PRESENT_BUT_NOT_RELEASE_READY').not.toMatch(/PRESENT_BUT_NOT_RELEASE_READY/);
  });

  it('SECURITY.md no longer declares release-blocked status', () => {
    const content = readFile('SECURITY.md');
    expect(content, 'SECURITY.md must NOT claim PRESENT_BUT_NOT_RELEASE_READY').not.toMatch(/PRESENT_BUT_NOT_RELEASE_READY/);
  });

  it('drizzle-kit is not listed in production dependency tables (Scope 2)', () => {
    const content = readFile('docs', 'THIRD_PARTY_LICENSES.md');
    // Find the production scope section and verify drizzle-kit is not a table row there
    const scope2 = content.substring(content.indexOf('Scope 2'), content.indexOf('Scope 3'));
    // Check that drizzle-kit does NOT appear as a table row in Scope 2 (pipe-delimited)
    expect(scope2, 'drizzle-kit must not appear as a production dependency table row').not.toMatch(/\| `drizzle-kit`/);
  });

  it('drizzle-kit correctly appears in dev scope (Scope 3)', () => {
    const content = readFile('docs', 'THIRD_PARTY_LICENSES.md');
    const scope3 = content.substring(content.indexOf('Scope 3'));
    expect(scope3, 'drizzle-kit must appear in dev scope (Scope 3)').toMatch(/drizzle-kit/);
  });

  // ---- final Slice 2 evidence consistency (Stage 7) ----

  it('react-router production path is not attributed to vitest/vite', () => {
    const content = readFile('docs', 'THIRD_PARTY_LICENSES.md');
    // Production section: react-router findings must be attributed to react-router-dom, not vitest/vite
    const prodSection = content.substring(content.indexOf('#### Generated Full Advisory Table'));
    const rrLines = prodSection.split('\n').filter(l => l.includes('react-router'));
    expect(rrLines.length, 'must list react-router advisories').toBeGreaterThan(0);
    for (const line of rrLines) {
      expect(line, `react-router row must not be attributed to vitest/vite: "${line.trim()}"`).not.toMatch(/vitest|vite/i);
    }
  });
});
