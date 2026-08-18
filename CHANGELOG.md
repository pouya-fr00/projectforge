# Changelog

> **Status: RELEASED on GitHub (2026-08-18). npm: NOT published.**
>
> - Version: **0.1.0**
> - Owner acceptance: **OWNER ACCEPTED (Release Polish)**
>
> The v0.1.0 release is published on GitHub. The npm package is NOT published.

All notable changes to ProjectForge are documented in this file. This project
adheres to [Semantic Versioning](https://semver.org/).

---

## 0.1.0 — 2026-08-18

**Status:** RELEASED on GitHub. npm package: NOT published.

Release scope: GitHub-only. No npm package publication planned.

### Highlights

- A local-first CLI that generates production-ready full-stack TypeScript
  projects from composable modules — no cloud account, no telemetry, no
  central service.
- Deterministic generation: the same inputs always produce the same project,
  with per-file SHA256 provenance recorded in `projectforge-lock.json`.
- Transactional mutations: every `create` / `add` is executed with backup,
  verification, and rollback; a failed operation never leaves a project in a
  broken state.
- A module ecosystem covering database (D1), authentication (Better Auth +
  Drizzle), RBAC, and product shells (user dashboard, admin dashboard,
  comments), with automatic transitive-dependency resolution.
- Responsive, polished starter UI with role-aware navigation, mobile support,
  accessible auth pages, and a restrained professional design system.
- Standalone CLI tarball packaging — install from a single `.tgz` file, no
  external registry required.

### New Commands

- `projectforge create <name> [starter]` — generate a project from a starter.
- `projectforge add <module...>` — add modules with transitive dependencies.
- `projectforge sync` — reconcile the lock against configured modules.
- `projectforge status` — show the current project state.
- `projectforge plan` — show the deterministic plan without executing it.
- `projectforge list` — list available starters and modules.
- `projectforge help` — command reference.

### New Modules

- `database-d1` — D1 binding helper, local migration runner.
- `auth` — Better Auth + Drizzle D1: sign-up, sign-in, session, logout,
  HttpOnly cookies, CORS/CSRF origin boundary.
- `rbac` — D1-backed roles/permissions middleware with admin guard.
- `user-dashboard` — authenticated user profile dashboard.
- `admin-dashboard` — admin-only user list behind RBAC.
- `comments` — authenticated comment model with create/list/edit/delete-own.

### Starter UI

- Responsive shell with mobile hamburger menu and 44px touch targets
- Role-aware navigation: anonymous sees public modules only, authenticated
  users see their authorized modules
- Polished Sign in / Sign up cards with persistent labels and focus states
- Account dashboard showing real name, email, and role badge
- Admin user table (desktop) and stacked cards (mobile)
- Comments with anonymous read + authenticated CRUD, auth prompt for
  unauthenticated visitors
- Shared visibility policy driving both Header navigation and Home cards

### Fixes (since last draft)

- Navigation path contract normalized: generated `webNavItems` use slashless
  route segments, preventing duplicate-slash links and fixing anonymous
  visibility filtering.
- Admin endpoint returns real user data from the Better Auth user table
  joined with RBAC roles.
- Dashboard role display fixed — `/api/auth/me` now exposes the user's role
  from the authoritative RBAC source.
- D1 migration path aligned with Wrangler's default location
  (`apps/api/migrations/`), removing invalid `migrations_dir` config.
- Standalone CLI add no longer deadlocks on project lock during nested
  operations.

### Breaking Changes

- None — this is the first public release.

### Known Limitations

- Diff-based `sync` and module uninstall are not yet implemented.
- The registry is bundled with the CLI; no external registry service exists.
- This is an early pre-1.0 release — generated output and APIs may change before v1.0.0.

---

## Pre-release history

### Phase 8 — Hardening (2026-08)

- Standalone CLI tarball with a bundled registry.
- Recovery drills (9/9), Linux/cross-OS matrix, artifact parity.
- Dependency remediation: generated production audit 0 critical / 0 high.
- 226 tests, 0 failed, 0 skipped at closure.

### Phase 7 — Documentation (2026-08)

- VitePress documentation site: 29 pages across 7 sections.
- Documentation example tests (24 integration + 10 link-validation tests).
- Persian guide, CI usage, Windows troubleshooting, and contributing pages.

### Phase 6 — Product shells (2026-08)

- `user-dashboard`, `admin-dashboard`, and `comments` modules.
- Server-side auth/session for all protected operations; UI reflects server
  state only.
- Responsive and RTL-ready inline styles; ARIA labels.

### Phase 5 — Data and identity (2026-08)

- `database-d1`, `auth` (Better Auth + Drizzle D1), and `rbac` modules.
- Provenance records with deterministic SHA256 and user-modified-file
  protection (`PF_USER_MODIFIED_MANAGED_FILE`).
- Pre-write failure, transactional rollback, and composition matrices.
- CORS/CSRF/cookie security boundary with `PF_AUTH_UNTRUSTED_ORIGIN`.

### Phase 4 — Golden starter (2026-07/08)

- `default` starter: React/Vite web, Hono/Cloudflare Workers API, shared
  packages, Vitest, Playwright, ESLint/Prettier, CI foundation.
- `projectforge create` end-to-end with `--dry-run` and `--no-install`.
- Transaction lock with stale-lock recovery; recovery report on failed
  rollback.

### Phase 3 — CLI and transactional execution (2026-07)

- Full command surface with stable exit codes (0–5) and JSON envelope output.
- `TransactionExecutor` with file/package operations, verification, backup,
  and rollback; failure-injection matrix.
- Real `dist/` emit; CLI runs from emitted JavaScript.

### Phase 2 — Schemas and pure planning engine (2026-07)

- Schema validators, deterministic dependency resolver, pure planner, path
  safety utilities, stable error model, and property tests.

### Phase 1 — Repository foundation (2026-07)

- pnpm monorepo, shared TypeScript config, ESLint/Prettier, Vitest workspace,
  CI workflow skeleton, package boundaries.

### Phase 0 — Research and proofs (2026-07)

- Official-source research, naming/package availability analysis, license
  verification, five spikes, four ADRs, and the Phase 0 Owner Gate.

---

*This changelog follows the template in `apps/docs/contributing/release-process.md`.*
