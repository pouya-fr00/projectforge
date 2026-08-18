# Create a Project

To create a new project, use the `create` command.

## Create with defaults

```bash
# Working directory: any directory
projectforge create my-app
```

This creates a project named `my-app` using the `default` starter in a directory of the same name.

## Files changed

| File/Directory | Description |
|---------------|-------------|
| `my-app/` | New project directory |
| `my-app/apps/web/` | React + Vite web application |
| `my-app/apps/api/` | Hono + Cloudflare Workers API |
| `my-app/packages/` | Shared packages (contracts, config, ui, test-utils) |
| `my-app/projectforge.json` | Project configuration |
| `my-app/projectforge-lock.json` | Lockfile with checksums |

## Options

```bash
# Dry-run: preview without writing files
projectforge create my-app --dry-run

# Skip package installation (dependencies are still declared)
projectforge create my-app --no-install

# Create in a specific directory
projectforge create my-app --cwd /path/to/parent

# JSON output
projectforge create my-app --json
```

## Next steps

After creating a project:

1. `cd my-app`
2. [Add modules](/guides/add-modules)
3. [Set up environment](/start/quickstart#_4-set-up-environment)
4. [Run locally](/start/quickstart#_5-run-locally)
