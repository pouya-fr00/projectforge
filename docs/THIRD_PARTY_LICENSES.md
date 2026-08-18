# Third-Party License Inventory

This document records the licenses of all third-party packages used by Project Factory,
organized by three independent scopes.

---

## Scope 1 — CLI Standalone Tarball

The `projectforge-cli-0.0.0.tgz` bundles ProjectFactory-authored code only.
It has **zero external npm dependencies** in `package.json`.

| Package | Version | License | Distributed inside CLI tarball? |
|---------|-------:|---------|--------------------------------|
| `@projectforge/cli` | 0.0.0 | MIT | Yes — own code |

**No third-party JS runtime code, vendored files, bundled dependencies, or source maps
containing third-party source are distributed inside the CLI tarball.**

The bundled registry (`dist/bundled/`) contains ProjectFactory-authored template files.
These templates declare dependency names and version ranges in generated `package.json`
manifests; they do not contain third-party source code.

---

## Scope 2 — Generated Project Production Dependencies

Dependencies declared in `apps/api/package.json` and `apps/web/package.json` of a
project created with `projectforge create my-app` and `projectforge add comments`.

The actual packages are installed by the consumer via `pnpm install` — ProjectForge
generates the manifest; it does not redistribute dependency code.

### apps/api Production Dependencies

| Package | Declared Version | Installed Version | SPDX License | LICENSE file in npm | Distributed by PF? |
|---------|-----------------|-------------------|--------------|---------------------|-------------------|
| `hono` | ^4.6.0 | — | MIT | Yes | No |
| `better-auth` | * | — | MIT | Yes | No |
| `drizzle-orm` | * | 0.45.2 | **Apache-2.0** | No | No |
| `react-router-dom` | * | — | MIT | Yes | No |

### apps/web Production Dependencies

| Package | Declared Version | SPDX License | LICENSE file in npm | Distributed by PF? |
|---------|-----------------|--------------|---------------------|-------------------|
| `react` | ^18.3.1 | MIT | Yes | No |
| `react-dom` | ^18.3.1 | MIT | Yes | No |
| `react-router-dom` | ^6.26.0 | MIT | Yes | No |

### Production Audit Classification

The 4 moderate advisories in `pnpm audit --prod` are genuine production findings:

| Advisory ID | GHSA | Package | Severity | Declaration | Dependency Chain | Runtime Reachable? |
|-------------|------|---------|----------|-------------|-----------------|-------------------|
| 1102341 | GHSA-67mh-4wv8-2f99 | esbuild | moderate | `dependencies` via better-auth>drizzle-kit | apps__api>better-auth>drizzle-kit>esbuild | No — build-time only (esbuild is a bundler) |
| 1124268 | GHSA-wrjc-x8rr-h8h6 | react-router | moderate | `dependencies` via react-router-dom | apps__api>react-router-dom>react-router | Yes — client-side routing |
| 1124270 | GHSA-jjmj-jmhj-qwj2 | react-router-dom | moderate | `dependencies` in apps/api and apps/web | apps__api>react-router-dom | Yes — client-side routing |
| 1124272 | GHSA-337j-9hxr-rhxg | react-router | moderate | `dependencies` via react-router-dom | apps__api>react-router-dom>react-router | Yes — client-side routing |

**react-router-dom is declared in `dependencies` (not `devDependencies`) of both
`apps/api` and `apps/web`. These are not "workspace importer elevation" or "dev tooling"
issues — they are correctly classified as production dependencies.**

The esbuild finding is a transitive dependency of `better-auth > drizzle-kit`.
While esbuild is a build-time tool (not runtime-reachable in a deployed API), it
appears in `--prod` because `better-auth` declares `drizzle-kit` as a dependency.
This is a true production-tree finding, even if not runtime-reachable.

---

## Scope 3 — Development Dependencies

Packages used only during development, testing, and documentation. Not distributed
in the CLI tarball and not part of generated project production manifests.

### Main Repository

| Package | Declared Version | SPDX License |
|---------|-----------------|--------------|
| `typescript` | ^5.7.2 | Apache-2.0 |
| `vitest` | ^4.1.10 | MIT |
| `eslint` | ^9.0.0 | MIT |
| `prettier` | ^3.0.0 | MIT |
| `vitepress` | ^1.6.4 | MIT |
| `@types/node` | ^22.20.1 | MIT |

### Generated Project

| Package | Scope | SPDX License | Declaration |
|---------|-------|--------------|-------------|
| `drizzle-kit` | devDependencies | MIT | apps/api (dev) |
| `vitest` | devDependencies | MIT | apps/api + apps/web (dev) |
| `vite` | devDependencies | MIT | apps/web (dev) |
| `wrangler` | devDependencies | MIT | apps/api (dev) |
| `typescript` | devDependencies | MIT | apps/api + apps/web (dev) |
| `miniflare` | transitive via wrangler | MIT | apps/api (dev) |
| `undici` | transitive via wrangler/miniflare | MIT | apps/api (dev) |
| `@cloudflare/workers-types` | devDependencies | MIT | apps/api (dev) |
| `@testing-library/*` | devDependencies | MIT | apps/web (dev) |
| `@vitejs/plugin-react` | devDependencies | MIT | apps/web (dev) |
| `jsdom` | devDependencies | MIT | apps/web (dev) |

---

## License Classification Summary

| Classification | Packages |
|---------------|----------|
| MIT | hono, better-auth, react, react-dom, react-router-dom, react-router, drizzle-kit, vitest, vite, wrangler, vitepress, eslint, prettier, @types/node, @testing-library/*, @vitejs/plugin-react, jsdom, miniflare, undici, @cloudflare/workers-types |
| Apache-2.0 | drizzle-orm, typescript |

**No packages with these classifications were found:**

```
UNKNOWN, UNLICENSED, GPL, AGPL, LGPL, SSPL, BUSL,
Commons Clause, Non-commercial, Source-available, Custom
```

---

## Apache-2.0 Requirements

### drizzle-orm@0.45.2

| Requirement | Status |
|-------------|--------|
| License text | Not shipped in npm package (no LICENSE file) |
| NOTICE file | Not shipped in npm package (no NOTICE file) |
| Attribution | Required by Apache-2.0 for redistribution |
| PF action required | **None** — PF does not redistribute drizzle-orm code |

Since ProjectForge does not embed, vendor, or redistribute drizzle-orm code,
Apache-2.0 notice obligations fall on the consumer who installs the dependency.

### typescript@5.7.2

| Requirement | Status |
|-------------|--------|
| License text | Shipped (LICENSE.txt) |
| NOTICE file | Shipped (ThirdPartyNoticeText.txt) |
| Attribution | Required by Apache-2.0 |
| PF action required | **None** — typescript is a dev dependency, not distributed |

---

## Distribution-Boundary Analysis

### What the CLI Tarball Contains

| Category | Present? | Notes |
|----------|----------|-------|
| ProjectForge-authored source | Yes | Bundled in `dist/` |
| Template source | Yes | `dist/bundled/` — ProjectForge-authored starter/module templates |
| Third-party JS runtime | No | Zero external npm deps |
| node_modules | No | |
| Vendored/copied dependency code | No | |
| Third-party license texts | No | Only root `LICENSE` (MIT, ProjectForge's own) |
| Source maps with third-party sources | No | |
| Generated project manifests | Yes (`dist/bundled/`) | Declarative only — name/version ranges; no code |

### What Generated Projects Receive

| Category | Mechanism |
|----------|-----------|
| Template files | Copied from bundled registry into the generated project |
| Dependency declarations | Written into `package.json` manifests as version ranges |
| Actual dependency code | **Not distributed by PF** — installed by consumer via `pnpm install` |

---

## NOTICE/Attribution Decision

**A separate NOTICE file is not required for the CLI tarball** because:

1. No external dependency code is embedded, vendored, or redistributed inside the CLI tarball.
2. All third-party code used by generated projects is installed independently by the consumer.
3. No third-party license texts or copyright notices are bundled with the distribution.
4. `drizzle-orm` (Apache-2.0, v0.45.2) does not ship a NOTICE file in its npm package.
5. `typescript` (Apache-2.0, v5.7.2) ships NOTICE files but is not distributed by PF.

This `docs/THIRD_PARTY_LICENSES.md` inventory serves as the project's license documentation.

---

## Audit Summary

### Main Repository

| Audit | Advisories | Critical | High | Moderate | Low |
|-------|-----------|----------|------|----------|-----|
| `--prod` | 0 | 0 | 0 | 0 | 0 |
| `--json` | 7 unique / 7 paths | 0 | 4 | 3 | 0 |

All 7 advisories are in dev dependencies (eslint, typescript-eslint, vitepress, brace-expansion).
None affect the CLI tarball or generated project production dependencies.

| pnpm ID | GHSA | Package | Severity | Patched |
|---------|------|---------|----------|---------|
| 1102341 | GHSA-67mh-4wv8-2f99 | esbuild | moderate | >=0.24.3 |
| 1116229 | GHSA-4w7w-66w2-5vf9 | vite | moderate | >=6.4.2 |
| 1120784 | GHSA-v6wh-96g9-6wx3 | vite | moderate | >=6.4.3 |
| 1123525 | GHSA-fx2h-pf6j-xcff | vite | high | >=6.4.3 |
| 1130588 | GHSA-mh99-v99m-4gvg | brace-expansion | high | >=1.1.17 |
| 1130734 | GHSA-rgw5-rvv9-x895 | brace-expansion | high | >=5.0.9 |
| 1130737 | GHSA-rgw5-rvv9-x895 | brace-expansion | high | >=1.1.18 |

### Generated Project

| Audit | Advisories | Critical | High | Moderate | Low |
|-------|-----------|----------|------|----------|-----|
| `--prod` | 4 unique / 5 paths | 0 | 0 | 4 | 0 |
| `--json` | 19 unique / 21 paths | 0 | 5 | 12 | 2 |

Severity metadata counts differ from advisory counts because a single advisory
can report multiple severities across different dependency paths.

#### Generated Full Advisory Table (19 rows)

| pnpm ID | GHSA | Package | Severity | Patched | Paths |
|---------|------|---------|----------|---------|-------|
| 1102341 | GHSA-67mh-4wv8-2f99 | esbuild | moderate | >=0.24.3 | 3 (drizzle-kit, wrangler) |
| 1112496 | GHSA-g9mf-h72j-4rw9 | undici | moderate | >=6.23.0 | 1 (wrangler>miniflare) |
| 1114594 | GHSA-2mjp-6q6p-2qxm | undici | moderate | >=6.24.0 | 1 (wrangler>miniflare) |
| 1114638 | GHSA-vrm6-8vpv-qv8q | undici | high | >=6.24.0 | 1 (wrangler>miniflare) |
| 1114640 | GHSA-v9p9-hfj2-hcw8 | undici | high | >=6.24.0 | 1 (wrangler>miniflare) |
| 1114642 | GHSA-4992-7rv2-5pvq | undici | moderate | >=6.24.0 | 1 (wrangler>miniflare) |
| 1119108 | GHSA-58qx-3vcg-4xpx | ws | moderate | >=8.20.1 | 1 (wrangler>miniflare) |
| 1121242 | GHSA-p88m-4jfj-68fv | undici | moderate | >=6.27.0 | 1 (wrangler>miniflare) |
| 1121245 | GHSA-vxpw-j846-p89q | undici | high | >=6.27.0 | 1 (wrangler>miniflare) |
| 1121250 | GHSA-35p6-xmwp-9g52 | undici | low | >=6.27.0 | 1 (wrangler>miniflare) |
| 1121255 | GHSA-g8m3-5g58-fq7m | undici | low | >=6.27.0 | 1 (wrangler>miniflare) |
| 1123259 | GHSA-96hv-2xvq-fx4p | ws | high | >=8.21.0 | 1 (wrangler>miniflare) |
| 1124066 | GHSA-f88m-g3jw-g9cj | sharp | high | >=0.35.0 | 1 (wrangler>sharp) |
| 1124268 | GHSA-wrjc-x8rr-h8h6 | react-router | moderate | >=7.18.0 | 1 (react-router-dom) |
| 1124270 | GHSA-jjmj-jmhj-qwj2 | react-router-dom | moderate | >=6.30.5 | 1 (direct) |
| 1124272 | GHSA-337j-9hxr-rhxg | react-router | moderate | >=7.18.0 | 1 (react-router-dom) |
| 1130716 | GHSA-8xcm-r25x-g524 | undici | moderate | >=6.28.0 | 1 (wrangler>miniflare) |
| 1130727 | GHSA-m8rv-5g2x-5cg5 | undici | moderate | >=6.28.0 | 1 (wrangler>miniflare) |
| 1130732 | GHSA-v3r7-h72x-cjcm | undici | moderate | >=6.28.0 | 1 (wrangler>miniflare) |

All 19 advisories are in dev tooling paths (wrangler, miniflare, sharp, drizzle-kit).
The 4 appearing in `--prod` are production dependency declarations (react-router-dom
in `dependencies` of apps/api and apps/web; esbuild via better-auth>drizzle-kit).
Undici, ws, and sharp advisories are all via wrangler>miniflare (devDependencies only).

---

Last updated: 2026-08-05
