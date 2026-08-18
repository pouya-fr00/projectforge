# Acceptance Test Matrix

## Create

- empty directory;
- new nested directory;
- path with spaces;
- Unicode/Persian path;
- non-empty compatible directory rejected or clearly handled;
- dry-run no writes;
- no-install;
- dependency install failure rollback.

## Module compositions

- database only;
- database + auth;
- database + auth + user dashboard;
- database + auth + RBAC + admin;
- full six-module app;
- request admin alone resolves dependencies;
- incompatible/unknown module fails before writes;
- repeated add is no-op.

## Ownership

- existing identical file;
- existing different user file;
- customized module source file;
- modified generated file;
- stale checksum;
- sync after valid project config change.

## Transactions

- injected failure at each stage;
- process interruption recovery;
- stale lock;
- concurrent add;
- rollback failure report.

## Platforms

- Windows PowerShell;
- Linux;
- non-TTY CI;
- JSON output parsing;
- no-color.

## Documentation

- all quickstart commands;
- all module install examples;
- all troubleshooting diagnostic commands;
- README links;
- docs build.
