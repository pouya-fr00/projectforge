# Known Issues

## Phase 9 — Release blockers

- **drizzle-orm@0.45.2 is Apache-2.0** (not MIT). The package does not ship a LICENSE or NOTICE file. Since ProjectForge does not redistribute drizzle-orm code, Apache-2.0 notice obligations fall on the consumer. This is documented in `docs/THIRD_PARTY_LICENSES.md`.

## Open before Phase 0 approval

- Final public name and package scope are not selected. **Recommendation:** `projectforge` (see ADR-004).
- Exact GitHub repository path depends on the owner's GitHub username and must be confirmed before Phase 1.
- Docs framework final choice awaits Phase 1 (VitePress, Starlight, or plain markdown under `apps/docs`).
- Automatic uninstall is out of V1 scope.
- Automatic merge of customized files during upgrades is out of V1 scope.
- Perfect rollback of every external package-manager side effect is not guaranteed; recovery behavior is documented as best-effort.

## Open before Phase 6

- `apps/docs` has no tests or content yet.
- `validateSemVer` accepts only exact versions or `>=X <Y` ranges; caret/tilde ranges are not supported.
- The CLI reads the local registry from `PROJECTFORGE_REGISTRY` or the current working directory; a bundled registry is not yet shipped.
- Package-manager rollback is best-effort; side effects left in `node_modules`/lockfiles may require manual cleanup.
- `projectforge add` and `projectforge sync` do not yet diff the existing lock against the requested modules or uninstall removed modules.
- Only one starter (`default`) is currently registered; additional starters and modules require new registry entries.
- Windows `createNodeAdapters` uses the shell only for package-manager commands, but arbitrary verification scripts still run on the user's PATH; review verification commands for safety.
- Operational `sync` tests with real modules and diff-based sync are pending.
- `d1-mock.ts` uses internal `any` casts and relies on `better-sqlite3`, which requires a C++ build toolchain; a pure-JS or prebuilt alternative is desirable.
- `apps/api/src/index.ts` casts feature routers to `Hono`; a typed features array would be cleaner.
- Full composition matrix failure scenarios inside generated projects (verification/migration failures) are pending.
- Database migrations are not executed by the TransactionExecutor. Modules ship a `migrations/runner.mjs` script that must be run manually; migration execution/rollback inside the executor is deferred to a future data-layer phase.
- Starter template files beyond the core project files (`projectforge.json`, `projectforge-lock.json`, `apps/api/src/features/index.ts`) do not yet carry provenance metadata. Integrity protection therefore covers core and module files, but not every individual starter-generated file. This is acceptable for Phase 5 and can be revisited when diff-based sync or multi-starter support is implemented.
  - **Integration contract:** modules may list migration runner commands in their `verification` array. Example convention: `{"verification": ["node migrations/runner.mjs"] }`. The executor runs these after file/package operations and treats a non-zero exit as `PF_VERIFICATION_FAILED`, rolling back the transaction. This covers migration failures that are expressible as verification commands.
  - **Limitation:** the executor does not yet diff or track applied migrations, automatically rerun them, or provide migration-specific rollback. Target phase: data-layer/operations phase after V1.
  - **Known edge:** if `fs.rm(backupPath)` repeatedly fails during rollback, stale `.backup-*` files may accumulate. This is best-effort cleanup; failed removals are not surfaced outside the recovery report. Target phase: hardened cleanup pass in data-layer/operations phase.

## Resolved during Phase 5 provenance/integrity slice

- Backup artifacts (`.backup-*`) are now removed after a successful transaction.
- `ProjectLock` stores per-file `provenance` with deterministic SHA256, ownership, and source metadata.
- `assertIntegrity` rejects modifications to factory-generated/module-managed files before any write.
- Dry-run reports integrity conflicts without creating files, locks, or backups.
- Legacy locks with only `generatedChecksums` are still supported; entries are treated as `factory-generated` for the integrity check.

## Resolved during Phase 5 closure

- Added module routers are now auto-mounted in `apps/api/src/index.ts` via generated `apps/api/src/features/index.ts`.
- Real SHA256 checksums are computed for generated files and stored in `projectforge-lock.json`.
- `auth` module now uses Better Auth + Drizzle D1 with D1-backed persistence.
- `rbac` middleware queries D1 for roles/permissions; default roles/permissions are seeded in the migration.
- Local tests use a `better-sqlite3`-backed D1 mock instead of `node:sqlite` to avoid Vitest resolution issues.
- Auth security tests cover HttpOnly cookies, logout invalidation, and client role escalation prevention.
- RBAC tests cover anonymous denial, user allow/deny, admin access via `user.role`, and admin access via `user_role` table.
- Engine tests cover deterministic SHA256 checksums and modified-content detection.
- CLI composition matrix tests cover single-module add, transitive dependency add, and repeated add determinism.
- CORS/CSRF origin boundary is enforced on auth routes with trusted-origin preflight and `PF_AUTH_UNTRUSTED_ORIGIN` stable code.
- Cookie policy tests verify `HttpOnly`, `SameSite=Lax`, `Path=/`, and conditional `Secure` attributes.
- CLI and engine outputs redact `BETTER_AUTH_SECRET`, passwords, API keys, tokens, and `Authorization` headers.

## Resolved during Phase 5

- `projectforge add` now resolves and installs module templates with transitive dependencies.
- Real modules (`database-d1`, `auth`, `rbac`) with tests, contracts, and migrations were added to the registry.
- Module template test files are excluded from workspace registry package tests.
- The generated project passes `typecheck`, `test`, and `build` after adding all three modules.
- The local `migrations/runner.mjs` successfully applies SQL migrations via `node:sqlite`.

## Resolved during Phase 4

- `projectforge create` now loads a starter from the registry, generates a plan, and executes it transactionally.
- Golden starter template includes React/Vite web, Hono/Cloudflare API, shared packages, Vitest, Playwright, and CI foundation.
- `--dry-run` and `--no-install` are implemented and tested.
- CLI is runnable from emitted `dist/` and works in a temp directory outside the repository.
- Transaction lock with active-lock and stale-lock recovery is implemented and tested.
- Recovery report is written when rollback fails.

## Resolved during Phase 9 Slice 3

- **Clean-clone CI green.** Tests required `dist/` (build artifacts) because integration tests spawn the built CLI binary. `.github/workflows/ci.yml` updated to add `pnpm -r build` before `pnpm test`. `.gitattributes` added with `* text=auto eol=lf` to enforce LF cross-platform (CRLF violations = 0 even with `core.autocrlf=true`). Full clean-clone CI: install → lint → typecheck → build → test → docs all PASS. Two-run stability confirmed (163/163 both runs, 0 failed, 0 skipped).

## Resolved during Phase 9 Slice 2

- **Security/enforcement contact resolved (Owner Gate closed).** Created `SECURITY.md` with an operational vulnerability reporting channel and `CODE_OF_CONDUCT.md` with an operational enforcement contact (both `pooya.fr2005@gmail.com`, owner-controlled). STATUS: OPERATIONAL. The Contributor Covenant 2.0 requirement is met.

## Resolved during Phase 2

- Cross-package TypeScript path mappings conflicted with per-package `rootDir`. Resolved by removing `rootDir` and keeping typecheck-only builds.
- `dist/` directories from earlier experimental builds were removed and added to `.gitignore`.
- Engine skeleton tests were outdated after introducing the real resolver and planner; the obsolete `skeleton.test.ts` was removed.
- Lock validation initially did not validate `starter` or `modules[]` item shape; now enforced via `validateInstalledModule`.
