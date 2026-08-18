# Requirements

## Operating System

- **Windows 10+** (x64)
- **Linux** (x64, glibc 2.28+)

macOS support is planned for a future release.

## Runtime

| Tool | Version |
|------|---------|
| Node.js | 20.x or 22.x |
| pnpm | 9.x or 10.x |
| Git | 2.40+ |

npm and yarn are also supported, but pnpm is the default for generated projects.

## Optional

- **Cloudflare account** — only needed if you deploy to Cloudflare Workers/D1. Local development works without one.
- **Wrangler CLI** — only needed for `wrangler dev` and `wrangler d1` commands.

## Verify your environment

```bash
node --version   # must be >= 20.0.0
pnpm --version   # must be >= 9.0.0
git --version    # must be >= 2.40.0
```
