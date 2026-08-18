---
layout: home
hero:
  name: Project Forge
  text: Free, local-first full-stack project generator
  tagline: Compose production-ready TypeScript projects from reusable modules — no cloud, no lock-in.
  actions:
    - theme: brand
      text: Quickstart
      link: /start/quickstart
    - theme: alt
      text: View on GitHub
      link: https://github.com/pouya-fr00/projectforge
features:
  - icon: 🏠
    title: Local-first
    details: Everything runs on your machine. No cloud account, no telemetry, no central service.
  - icon: 🧩
    title: Composable modules
    details: Add database, auth, RBAC, dashboards, and comments one module at a time. Transitive dependencies are resolved automatically.
  - icon: 🔒
    title: Transactional safety
    details: Every mutation is transactional with automatic backup and rollback. Your project is never left in a broken state.
  - icon: 📋
    title: Deterministic
    details: Same inputs always produce the same project. Provenance and checksums prevent accidental overwrites of your custom code.
  - icon: 🆓
    title: Free and open source
    details: MIT licensed. No paywalls, no premium modules, no vendor lock-in.
---

## What is Project Forge?

Project Forge is a CLI tool that removes the repeated setup work of full-stack TypeScript projects. Instead of copying boilerplate or running `create-*` for every piece, you run:

```bash
projectforge create my-app
projectforge add auth admin-dashboard
```

It generates a production-ready monorepo with React, Hono, D1, authentication, role-based access control, and more — deterministically, transactionally, and safely alongside your custom code.

## Who is it for?

- **Developers** who want a production-ready foundation without stitching together templates.
- **Teams** who want consistent, auditable project structure across repositories.

## What it changes

Project Forge generates factory-owned files and your source-owned files side by side. Generated files have provenance and checksums — sync never overwrites your custom code. You always know what was generated and what you wrote.

```text
my-app/
├── apps/
│   ├── web/          # React + Vite (factory-generated)
│   └── api/          # Hono + Cloudflare Workers (factory-generated)
├── packages/
│   ├── contracts/    # Shared types (factory-generated + your extensions)
│   ├── config/       # Environment validation (factory-generated)
│   ├── ui/           # Shared UI components (your code)
│   └── test-utils/   # Test helpers (factory-generated)
├── projectforge.json        # Your project config
└── projectforge-lock.json   # Factory lockfile with checksums
```

## Five-minute Quickstart

```bash
# Prerequisites: Node.js 20+, pnpm 9+
projectforge create my-app
cd my-app

# Add modules
projectforge add auth admin-dashboard

# Set environment variables
cp .env.example .env
# Edit .env and set BETTER_AUTH_SECRET

# Run locally
pnpm dev
```

## Supported Stack

| Layer | Technology |
|-------|-----------|
| Web | React 19, Vite 6, React Router 6 |
| API | Hono, Cloudflare Workers |
| Database | D1, Drizzle ORM |
| Auth | Better Auth |
| Testing | Vitest, Playwright |
| Language | TypeScript 5.7 strict |

## Available Modules

| Module | Description |
|--------|-------------|
| `database-d1` | D1 binding, typed helpers, migration runner |
| `auth` | Email/password authentication with Better Auth |
| `rbac` | Role-based access control with admin guard |
| `user-dashboard` | Protected user dashboard shell |
| `admin-dashboard` | Admin dashboard with RBAC enforcement |
| `comments` | Authenticated comment system |

## Documentation

- [Getting Started](/start/introduction) — requirements, quickstart, and first steps
- [Guides](/guides/create) — create projects, add modules, customize safely
- [CI Usage](/guides/ci) — running Project Forge in CI/CD
- [CLI Reference](/reference/cli) — every command and option
- [Module Reference](/reference/modules) — module catalog
- [Error Codes](/reference/errors) — every error code explained
- [Troubleshooting](/troubleshooting/) — common issues and fixes
- [راهنمای فارسی](/fa/) — Persian startup guide
- [Contributing](/contributing/development-setup) — development setup and module authoring

## Status

Project Forge v0.1.0 is released on GitHub. The default starter and all six V1 modules are implemented and pass full clean-room verification.

## License

MIT — see [LICENSE](https://github.com/pouya-fr00/projectforge/blob/main/LICENSE).
