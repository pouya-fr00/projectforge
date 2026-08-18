# Test Strategy

## Objective

Prove safety, determinism, usability, composition, and generated-project quality.

## Layers

### Schema tests

Valid/invalid starter, module, project, lock, JSON output, and error schemas.

### Pure unit/property tests

- dependency graph ordering;
- cycles/conflicts;
- deterministic plan sorting;
- path normalization;
- ownership decisions;
- checksum/provenance;
- state migration;
- error mapping.

Use property-based testing only if Phase 0 selects a maintained dependency with clear value.

### Filesystem integration

Temporary repositories for copy/render/generate/conflict/lock/transaction/rollback.

### CLI integration

Spawn real binary; assert stdout/stderr/exit code/JSON/no-color/non-TTY.

### Clean-room E2E

Generate project, install dependencies, run generated project lint/typecheck/tests/build, add modules, rerun checks.

### Module composition

All combinations required by `ACCEPTANCE_TEST_MATRIX.md`.

### Failure injection

Every transaction stage.

### Security

Path traversal, symlink escape, shell argument injection, secret redaction, malicious manifests, corrupted state.

### Documentation

Execute code blocks or canonical example scripts; check links and generated reference drift.

### Accessibility/UI

Generated dashboards/pages receive Playwright/axe/keyboard/responsive/RTL tests.

## Evidence

Each phase records test results with date, commit, command, environment, and result.
