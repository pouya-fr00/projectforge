# ProjectForge

**Local-first CLI that generates modular full-stack TypeScript starter projects.**

> **Status:** v0.1.0 released on GitHub (2026-08-18). The npm package is NOT published.

ProjectForge scaffolds a React frontend, Hono API, Cloudflare D1 configuration, and shared packages. You can add modules for features such as comments, user dashboards, authentication, and role-based access control. Review and adapt the generated project for your own requirements before deployment.

---

## What It Is

- A CLI that **generates** projects from a starter template
- A **module system** — `projectforge add comments` installs a feature with its routes, tests, database migrations, and dependencies
- **Tracked changes** — the engine records SHA256 provenance for managed files
- **File transaction** — planned file changes use backups, verification, and rollback on failure; package-manager side effects and database migrations have separate limits described in [Known Issues](docs/KNOWN_ISSUES.md)
- **Local only** — no cloud account, no telemetry, no central service

## What It Is Not

- Not a package manager or build tool
- Not an online service or SaaS
- Not a deployment platform
- Not a finished application — it's a project generator

---

## Screenshots

| Anonymous home | Anonymous comments | Admin users (desktop) |
| --- | --- | --- |
| ![Anonymous home with module cards](docs/assets/screenshots/01-home-anonymous-desktop.png) | ![Anonymous comments with sign-in prompt](docs/assets/screenshots/02-comments-anonymous.png) | ![Admin users table](docs/assets/screenshots/04-admin-users-desktop.png) |

---

## Quick Start

Use the [official v0.1.0 GitHub release](https://github.com/pouya-fr00/projectforge/releases/tag/v0.1.0) to download the [standalone CLI tarball](https://github.com/pouya-fr00/projectforge/releases/download/v0.1.0/projectforge-cli-0.1.0.tgz). A [SHA-256 checksum file](https://github.com/pouya-fr00/projectforge/releases/download/v0.1.0/projectforge-cli-0.1.0.tgz.sha256) is also available. The package is not published on npm. For this repository's documented toolchain, use Node.js 24 or newer and pnpm 11.10.0.

```bash
# After downloading the standalone v0.1.0 tarball:
npm install ./projectforge-cli-0.1.0.tgz
npx projectforge create my-app
cd my-app

# Add modules:
npx projectforge add comments
npx projectforge add user-dashboard
npx projectforge add admin-dashboard

# Install, migrate, and run:
pnpm install
cd apps/api && npx wrangler d1 migrations apply my-app-db --local && cd ../..
pnpm -r build

# Start API:
cd apps/api && npx wrangler dev --port 8787

# Start Web (separate terminal):
cd apps/web && npx vite --port 5173
```

---

## Generated Stack

| Layer | Technology |
|-------|-----------|
| **Web** | React 18 · Vite · React Router v6 |
| **API** | Hono · Cloudflare Workers · Wrangler |
| **Database** | Cloudflare D1 (SQLite) · Drizzle ORM |
| **Auth** | Better Auth (email/password) · HttpOnly session cookies |
| **RBAC** | Roles + permissions backed by D1 |
| **Testing** | Vitest · Testing Library · Playwright |

---

## Modules

| Module | Description |
|--------|-------------|
| `database-d1` | D1 binding, typed queries, migration runner |
| `auth` | Sign-up, sign-in, sessions, cookie-based auth |
| `rbac` | Roles and permissions enforced at the API layer |
| `comments` | Authenticated comment model (create, list, edit, delete) |
| `user-dashboard` | Authenticated user profile dashboard |
| `admin-dashboard` | Admin-only user list with role badges |

All modules resolve transitive dependencies automatically — adding `admin-dashboard` pulls in `rbac`, `auth`, and `database-d1`.

---

## Commands

```bash
projectforge create <name> [starter]   # Generate a new project
projectforge add <module...>           # Add modules with dependencies
projectforge sync                      # Reconcile lock with config
projectforge status                    # Show project state
projectforge plan                      # Show the plan without executing
projectforge list                      # List available starters and modules
projectforge help                      # Command reference
```

---

## Project Structure (Generated)

```
my-app/
├── apps/
│   ├── api/          # Hono API (Cloudflare Workers)
│   └── web/          # React + Vite frontend
├── packages/         # Shared config, contracts, test-utils, ui
├── docs/             # Project documentation site (VitePress)
├── migrations/       # D1 SQL migration files
├── projectforge.json # Project configuration
└── package.json      # pnpm workspace root
```

---

## Testing

```bash
# Run all workspace tests:
pnpm -r test

# With typecheck, lint, and build:
pnpm -r typecheck
pnpm lint
pnpm -r build
pnpm -r test
```

The source repository includes tests for schemas, planning, registry loading, and CLI integration, including installed-artifact, module-composition, rollback, and provenance checks.

---

## Requirements

- **Node.js** ≥ 24 (declared in the root `package.json`)
- **pnpm** 11.10.0 (declared by the root `packageManager` field and used in CI)
- **Cloudflare Wrangler** (for local D1 development)
- **Platform evidence:** CI runs on Ubuntu Linux. Windows and macOS are not verified by the current CI; see the [requirements guide](apps/docs/start/requirements.md) for the scope of this statement.

---

## Security

- Authentication via Better Auth with HttpOnly session cookies
- RBAC enforcement at the API layer (not client-side)
- CORS/CSRF origin boundary on all auth routes
- Secret redaction in logs and error messages
- See [SECURITY.md](SECURITY.md) for reporting vulnerabilities

---

## Known Limitations (v0.1.0)

- Migrations are not executed by the CLI; generated projects include a D1 migration workflow via Wrangler
- Diff-based `sync` and module uninstall are not yet implemented
- Rollback of package-manager side effects and database migrations is not guaranteed; see [Known Issues](docs/KNOWN_ISSUES.md)
- The registry is bundled with the CLI; no external registry service exists
- This is an early pre-1.0 release — APIs and generated output may change before v1.0.0

---

## Documentation

- [Quick Start Guide](apps/docs/start/quickstart.md)
- [Module Reference](apps/docs/reference/modules.md)
- [CLI Reference](apps/docs/reference/cli.md)
- [Contributing](CONTRIBUTING.md)

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

*ProjectForge v0.1.0 is released on GitHub (2026-08-18). The npm package is NOT published.*

*Created and maintained by Pouya Fereydouni.*
