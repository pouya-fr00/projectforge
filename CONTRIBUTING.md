# Contributing to ProjectForge

ProjectForge v0.1.0 is publicly released on GitHub, and contributions are welcome.

## First-time contribution flow

1. Fork the repository
2. Create a focused branch
3. Make the change
4. Run the required validation
5. Push to your fork
6. Open a Pull Request against `main`

## Local Setup

### Prerequisites

- **Node.js** v24.x (matching the version in `package.json` `engines` field)
- **pnpm** v11.x (matching `package.json` `packageManager` field)
- **Git** 2.x+

### Install

```bash
pnpm install --frozen-lockfile
```

### Verify

```bash
pnpm lint
pnpm -r typecheck
pnpm -r --workspace-concurrency=1 test
pnpm -r build
pnpm --filter @projectforge/docs build
```

All commands must exit with code `0` and `0 failed / 0 skipped` tests.

## Development Workflow

### Bounded Changes

- Make the smallest change that achieves the goal.
- Prefer composition over rewriting.
- Reuse existing helpers, types, and conventions.
- If a change touches an exported symbol, find and update all references.

### Test Expectations

- New behavior requires a test (unit, integration, or clean-room).
- Test failure paths, not only success paths.
- Generated clean-room tests must be source-tree independent.
- Tests must not depend on network access to the public npm registry.
- Tests must not assume a particular OS shell quoting convention.

### Clean-Room Testing

When testing the installed artifact:

1. Build the standalone tarball: `pnpm --filter @projectforge/cli pack:standalone`
2. Create a consumer outside the monorepo: `mkdir -p /tmp/pf-test && cd /tmp/pf-test`
3. Install from the local tarball: `pnpm add <absolute-path-to-tgz>`
4. Never use the monorepo source CLI binary.
5. Never reference monorepo paths in assertions.

## Commit Discipline

- Never amend, reset, or rebase commits you did not author.
- Never rewrite history.
- Commit code, tests, docs, and log updates separately or in clearly attributed groups.
- Commit messages describe "why", not "what".
- Each commit should leave the working tree clean.

## Policies

### No Secrets

Never commit secrets, tokens, API keys, passwords, or private keys. Test fixtures must
use obviously fake placeholder values (`test-secret-do-not-use`).

### No Push / Publish / Deploy Without Maintainer Approval

These actions require explicit maintainer approval:
- `git push` to any remote
- `npm publish` or any registry publish
- Release, deploy, or merge to a public branch
- GitHub operations that change repository visibility
- Any action with cost implications

### Maintainer approval

Maintainer approval is required for:
- Public exposure or repository creation
- Release, merge, publish, or deploy
- Cost, credentials, or permissions
- Destructive actions
- Material, irreversible scope changes
- Serious, unresolved security risks

## Architecture

See `architecture/` and `implementation/` directories for detailed documentation.

- `PROJECT_FACTORY_MASTER_SPEC.md` — master specification
- `product/DEFINITION_OF_DONE.md` — definition of done per phase
