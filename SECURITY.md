# Security Policy

## Supported Versions

ProjectForge is publicly released. The current public release line is **0.1.x**
(the initial public release is **v0.1.0**).

| Version | Supported                          |
| ------- | ---------------------------------- |
| 0.1.x   | Yes — current public release line  |
| < 0.1.0 | No — unreleased development builds |

## Reporting a Vulnerability

**DO NOT** open public issues for security vulnerabilities.

To report a vulnerability, email
**[pooya.fr2005@gmail.com](mailto:pooya.fr2005@gmail.com)**.
This address is controlled and monitored by the project owner.

**STATUS: OPERATIONAL** — the email reporting channel is active.

## Responsible Disclosure

- Report vulnerabilities privately before any public disclosure.
- Allow reasonable time for the issue to be investigated and patched.
- Do not exploit or exfiltrate data without explicit permission.

## Scope

Security reports should concern:
- The ProjectForge CLI tool itself
- The standalone CLI artifact (`.tgz`)
- Generated project templates produced by the tool
- The bundled module registry distributed with the tool

## Secrets Handling

Never include secrets, tokens, API keys, passwords, or private keys in:
- Git-tracked files
- Generated project templates
- Source code comments
- Test fixtures (unless using known-safe placeholder values)
- Documentation examples

The CLI implements secret redaction (`[REDACTED]`) for error/recovery output.
The packaging pipeline verifies no secrets leak into the standalone tarball.

## Secure Development Practices

- `pnpm audit` is run on both the main repository and generated projects.
- Generated projects must achieve `0 Critical / 0 High` in production dependency audits.
- The standalone tarball is inspected for secrets, test files, and local paths before packaging.
- Dependency updates that fix vulnerabilities are applied in a bounded, test-verified manner.
