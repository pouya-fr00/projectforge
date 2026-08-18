# Release Process

**Note:** Project Forge is not yet released. This page documents the planned process for when the repository becomes public.

## Pre-release checklist

Before any release:

- [ ] All development phases completed
- [ ] All tests pass (`pnpm -r test`)
- [ ] TypeScript compiles without errors (`pnpm -r typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Documentation site builds (`pnpm --filter @projectforge/docs build`)
- [ ] Clean-room create + add cycle passes
- [ ] All maintainer approval gates resolved
- [ ] `CHANGELOG.md` updated with all changes since last release
- [ ] Version bumped in `package.json` files (root + packages)

## Versioning

Project Forge follows **Semantic Versioning** (SemVer):

- **MAJOR** (X.0.0): Breaking changes to generated project structure, module manifests, or CLI interface.
- **MINOR** (0.X.0): New modules, new commands, new features (backward-compatible).
- **PATCH** (0.0.X): Bug fixes, documentation updates, performance improvements.

While in pre-release (0.x), minor versions may include breaking changes with clear migration notes.

## Release steps (planned)

These steps require explicit maintainer approval — do not execute without it:

1. **Audit:** Run `pnpm audit` and review dependency licenses.
2. **Version:** Update versions in all `package.json` files.
3. **Changelog:** Finalize `CHANGELOG.md`.
4. **Tag:** Create a git tag: `git tag v0.0.0`
5. **Build:** `pnpm -r build` to produce final dist artifacts.
6. **Pack inspection:** Run `pnpm pack --dry-run` on publishable packages.
7. **Publish:** `pnpm publish` (requires npm credentials and explicit approval).
8. **GitHub Release:** Create a release with release notes.

**None of these steps should be performed without explicit maintainer approval.**

## Release notes template

Each release should include:

```markdown
## vX.Y.Z — Release Title

### Highlights
- One-line summary of the most important changes.

### New Modules
- `module-name`: description

### New Commands
- `command-name`: description

### Fixes
- Description of bugs fixed.

### Breaking Changes
- Description of breaking changes and migration steps.

### Known Limitations
- Honest list of known issues and V1 gaps.
```

## Current status

As of the current workspace:

- **Version:** 0.1.0 (released 2026-08-18)
- **npm package:** Not published
- **Repository:** Public — `github.com/pouya-fr00/projectforge`

All changes are recorded in `CHANGELOG.md` at the repository root. The GitHub
release has been executed. npm publication has NOT been performed and remains
gated on separate maintainer approval.
