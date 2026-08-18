# Quickstart

This guide takes you from zero to a running full-stack application in about five minutes.

## 1. Create a project

```bash
# Working directory: any empty directory
projectforge create my-app
```

Expected output:

```text
Created project "my-app" with starter "default" at /path/to/my-app
```

This generates a complete monorepo with React, Hono, shared packages, and CI foundation.

## 2. Explore the generated project

```bash
cd my-app
ls
```

You'll see:

```text
apps/           # web (React) and api (Hono)
packages/       # contracts, config, ui, test-utils
docs/           # ARCHITECTURE.md, MODULES.md
pnpm-workspace.yaml
projectforge.json
projectforge-lock.json
```

## 3. Add modules

```bash
# Add authentication (transitively installs database-d1)
projectforge add auth

# Add admin dashboard (transitively installs rbac, auth, database-d1)
projectforge add admin-dashboard
```

Each module adds files, packages, migrations, and generated route integrations.

## 4. Set up environment

```bash
cp .env.example .env
```

Edit `.env` and set:

```env
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:5173
```

## 5. Run locally

```bash
pnpm dev
```

This starts both the web dev server and the API worker.

## 6. Check project health

```bash
projectforge doctor
```

Expected output:

```text
Project looks healthy.
```

## Next steps

- [Add more modules](/guides/add-modules)
- [Learn about safe customization](/guides/customize)
- [Read the CLI reference](/reference/cli)
- [راهنمای فارسی](/fa/) — Persian guide
- [Windows troubleshooting](/troubleshooting/windows) — if you're on Windows
