# CLI Command Reference

## Global Options

All commands support these global options:

| Option | Description |
|--------|-------------|
| `--help` | Show help for a command |
| `--version` | Show CLI version |
| `--json` | Output in machine-readable JSON |
| `--no-color` | Disable colored output |
| `--verbose` | Show detailed output |
| `--cwd <path>` | Set working directory (default: current directory) |
| `--dry-run` | Preview changes without writing files |
| `--no-install` | Skip package installation and verification. Dependencies are still declared in `package.json`. |

## Commands

### `projectforge create <name> [starter]`

Creates a new project from a starter template.

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Project name (kebab-case, no path separators) |
| `starter` | No | Starter ID (default: `default`) |

**Examples:**

```bash
# Create with default starter
projectforge create my-app

# Create with dry-run preview
projectforge create my-app --dry-run

# Create without installing dependencies (run `pnpm install` afterward)
projectforge create my-app --no-install
```

**Exit codes:** 0 (success), 1 (target not empty, starter not found), 2 (missing name)

---

### `projectforge add <module...>`

Adds one or more modules to an existing project. Transitive dependencies are resolved and installed automatically.

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `module` | Yes (1+) | Module IDs to add |

**Examples:**

```bash
# Add a single module
projectforge add auth

# Add multiple modules
projectforge add auth admin-dashboard

# Dry-run preview
projectforge add auth --dry-run

# Add module without installing (deps are declared; run `pnpm install` afterward)
projectforge add auth --no-install
```

**Exit codes:** 0 (success), 1 (module not found, conflict, incompatible, user-modified), 2 (missing argument)

---

### `projectforge sync`

Synchronizes the project with the current module configuration. Re-applies generated files without overwriting user modifications.

**Examples:**

```bash
# Sync the project
projectforge sync

# Dry-run preview
projectforge sync --dry-run
```

**Exit codes:** 0 (success), 1 (project error, user-modified file), 2 (not a project)

---

### `projectforge status`

Shows the current project status including active starter and installed modules.

**Examples:**

```bash
# Human output
projectforge status

# JSON output
projectforge status --json
```

**Exit codes:** 0 (success), 1 (not a project)

---

### `projectforge doctor`

Checks the project for common issues.

**Examples:**

```bash
# Human output
projectforge doctor

# JSON output
projectforge doctor --json
```

**Exit codes:** 0 (healthy), 1 (issues found)

---

### `projectforge plan [module...]`

Generates and displays a deterministic plan without executing it. Useful for previewing what `add` or `sync` would do.

**Arguments (optional):** Module IDs to include in the plan.

**Examples:**

```bash
# Plan for all configured modules
projectforge plan

# Plan for specific modules
projectforge plan auth admin-dashboard

# JSON output
projectforge plan auth --json
```

**Exit codes:** 0 (success), 1 (module not found, conflict)

---

### `projectforge explain <module...>`

Explains what adding modules would do, including dependency order and operation counts.

**Examples:**

```bash
projectforge explain auth rbac
```

**Exit codes:** 0 (success), 1 (project error)

---

### `projectforge list`

Lists all available starters and modules from the registry.

**Examples:**

```bash
# Human output
projectforge list

# JSON output
projectforge list --json
```

**Exit codes:** 0 (success)

---

### `projectforge upgrade --check`

Checks for available upgrades. Not yet implemented — returns `PF_NOT_IMPLEMENTED`.

**Exit codes:** 2 (not implemented)

---

### `projectforge help`

Shows available commands.

**Examples:**

```bash
projectforge help
projectforge help --json
```

## See Also

- [CI Usage Guide](/guides/ci) — running Project Forge in CI/CD pipelines
- [Exit Codes Reference](/reference/exit-codes) — detailed exit code reference
- [Error Codes Reference](/reference/errors) — every error code explained
