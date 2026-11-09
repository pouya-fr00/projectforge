# Requirements

## Operating System

The repository CI runs on Ubuntu Linux. This is the platform verified by the current CI configuration. Windows troubleshooting guidance is available, but the current CI does not verify Windows or macOS. Do not treat either platform as tested for this release without a separate run.

## Runtime

| Tool | Version |
|------|---------|
| Node.js | 24 or newer, as declared by the root `package.json` |
| pnpm | 11.10.0, as declared by the root `packageManager` field and used in CI |
| Git | Required to clone the source; no minimum version is declared by this repository |

The standalone GitHub release is installed from a local tarball with npm in the Quick Start. The source repository uses pnpm. Compatibility with other Node.js or pnpm versions is not established by the current CI configuration.

## Optional

- **Cloudflare account** — only needed if you deploy to Cloudflare Workers/D1. Local development works without one.
- **Wrangler CLI** — only needed for `wrangler dev` and `wrangler d1` commands.

## Verify your environment

```bash
node --version   # use 24 or newer for the source repository
pnpm --version   # use 11.10.0 for the source repository
git --version
```
