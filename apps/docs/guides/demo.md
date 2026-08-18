# Verified CLI Walkthrough

> **Scope: this page is a verified CLI walkthrough — not a Web UI demo and not
> Owner acceptance evidence.** It shows a real, end-to-end command-line
> session with the Project Forge CLI. It does not demonstrate the generated
> Web UI, authentication, dashboards, or the running API, and it must not be
> used to claim those are healthy.

Every transcript below was captured by running the built CLI (`0.0.0`, engine
`0.1.0`) against the bundled registry — nothing is simulated. The transcript
was captured in a temporary directory and only proves the CLI command surface
works as shown.

## 1. Check the CLI

```bash
$ projectforge --version
0.0.0
```

## 2. Create a project

```bash
$ projectforge create demo-app --no-install
Created project "demo-app" with starter "default" at <path>/demo-app
```

The `default` starter generates a complete monorepo: a React + Vite web app, a
Hono API, shared packages, migrations, CI, and the `projectforge.json` /
`projectforge-lock.json` bookkeeping files:

```text
demo-app/
├── README.md
├── apps/            # web (React + Vite), api (Hono)
├── docs/            # ARCHITECTURE.md, MODULES.md
├── migrations/
├── packages/        # contracts, config, ui, test-utils
├── projectforge.json
├── projectforge-lock.json
└── pnpm-workspace.yaml
```

## 3. Add modules

```bash
$ projectforge add auth comments --no-install
Planning to add modules: auth, comments
Added modules: auth, comments
```

Transitive dependencies are resolved automatically. `auth` pulls in
`database-d1`; `comments` builds on `auth`:

```bash
$ projectforge status
Project: demo-app
Starter: default
Modules in config: database-d1, auth, comments
Installed modules: database-d1, auth, comments
```

## 4. Inspect what a module will do

```bash
$ projectforge explain auth
Plan plan-auth will:
  - Install modules in order: database-d1 -> auth
  - Perform 15 file operations
  - Add 4 packages
```

## 5. Dry-run a repeated add (determinism)

Re-adding the same modules produces a stable plan and changes nothing:

```bash
$ projectforge add auth comments --dry-run
Dry-run: Plan plan-auth-comments: database-d1 -> auth -> comments | 20 file ops | 5 pkg ops
```

The JSON envelope (truncated) shows the same plan data in machine-readable
form — the `planId` lives inside the `plan` object, along with the resolved
dependency order and the full operation lists:

```json
{
  "dryRun": true,
  "plan": {
    "planId": "plan-auth-comments",
    "requestedModules": ["auth", "comments"],
    "dependencyOrder": ["database-d1", "auth", "comments"],
    "fileOperations": ["..."],
    "packageOperations": ["..."]
  }
}
```

## 6. Available starters and modules

```bash
$ projectforge list
Starters:
  - default
Modules:
  - admin-dashboard
  - auth
  - comments
  - database-d1
  - rbac
  - user-dashboard
```

## 7. Health check

```bash
$ projectforge doctor
Project looks healthy.
```

## What you'd do next (not verified on this page)

```bash
cd demo-app
pnpm install
node migrations/runner.mjs   # apply SQL migrations
pnpm run dev                 # web on :5173, api on :8787
```

Then visit `http://localhost:5173`, sign up, and use the auth-protected
dashboard, comments, and admin features.

> **Note:** The steps above are shown for context only. Whether the generated
> project actually installs, migrates, typechecks, tests, builds, and runs the
> Web/API is verified separately in the Owner manual-test workspace — not
> claimed by this CLI transcript.

> **Note:** This transcript was captured on Windows with the emitted CLI from
> `packages/cli/bin/projectforge.js`. Output is identical on Linux and macOS;
> line endings are enforced to LF via `.gitattributes`.
