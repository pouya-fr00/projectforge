# Security Model

## Assets

- user source code;
- filesystem integrity;
- secrets in local environment;
- package/repository supply chain;
- generated auth/database security;
- maintainer release credentials.

## Threats

- path traversal in module assets;
- symlink escape;
- overwrite of user files;
- command injection;
- malicious module scripts;
- package confusion or compromised dependency;
- secret leakage in logs/lockfiles;
- generated insecure auth defaults;
- tampered project state;
- concurrent mutation corruption;
- documentation commands that perform unsafe actions.

## Controls

- no arbitrary module scripts;
- canonical path validation;
- deny writes outside project root;
- reject absolute asset paths;
- detect symlinks at boundaries;
- validate all manifests with JSON Schema;
- structured process execution without shell interpolation;
- redact environment values;
- transaction lock and state hash;
- integrity/checksum records;
- dependency and license review;
- dedicated adversarial tests;
- owner approval for publishing/deployment.

## Generated auth

Auth module must:

- follow official Better Auth/Hono guidance current at implementation;
- use secure cookie configuration in production;
- validate trusted origins/CORS;
- avoid logging credentials/tokens;
- include CSRF/session tests appropriate to upstream behavior;
- document secret generation;
- fail clearly when production-required configuration is missing;
- avoid claiming email verification/reset without an actual mail integration.

## Disclosure

Public repository includes `SECURITY.md` with private reporting guidance selected by owner before release.
