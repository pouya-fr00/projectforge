# CLI Command Specification

Working binary: `project-factory`. Final binary chosen in Phase 0.

## `create <directory>`

Options:

- `--starter <id>`
- `--modules <csv>`
- `--language <en|fa>` for CLI display where supported
- `--yes`
- `--dry-run`
- `--json`
- `--no-install`

Behavior: validates empty/acceptable target, computes full plan, creates project transactionally, optionally installs dependencies, runs baseline verification.

## `list`

Options: `--type starter|module`, `--capability`, `--json`.

## `explain <id>`

Shows purpose, dependencies, conflicts, files, packages, env, migrations, generated contributions, limitations, docs.

## `plan [modules...]`

Computes changes without writes. Equivalent safety to dry-run and suitable for automation.

## `add <modules...>`

Resolves dependencies, shows plan, executes transaction, verifies, records lock.

## `sync`

Regenerates only factory-generated files from desired state. Refuses unexpected generated drift unless explicitly recovered through documented flow.

## `status`

Shows starter/modules/versions/customized files/generated drift/available checks.

## `doctor`

Checks state/schema/files/checksums/dependencies/env declarations/migrations/generated outputs/repository verification availability.

`doctor --fix` is deferred unless fixes are individually safe, previewable, and reversible.

## `upgrade --check`

Read-only report. No automatic merge in V1.

## Global options

- `--help`
- `--version`
- `--json`
- `--no-color`
- `--verbose`
- `--cwd <path>`

## Non-interactive rule

Every interactive decision has a flag for CI and automation.
