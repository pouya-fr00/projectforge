# Transaction and Rollback

## Goal

A failed add/create operation must not leave a partially mutated project.

## Plan object

A plan is immutable and includes:

- plan ID;
- project root identity;
- expected current state hash;
- requested modules;
- dependency graph;
- file operations;
- structured data operations;
- dependency operations;
- generated outputs;
- migration assets;
- verification steps;
- warnings;
- rollback strategy.

## Preflight

Before writes:

- normalize real project root;
- reject symlink escape targets;
- check disk write access;
- validate current state/checksums;
- detect existing lock;
- calculate conflicts;
- ensure package manager availability;
- verify plan state hash still matches.

## Staging

Preferred V1 strategy:

1. create `.project-factory/transactions/<id>/`;
2. store transaction metadata;
3. copy affected existing files to backup area;
4. render all new content to stage area;
5. validate staged files and generated schemas;
6. apply deterministic writes;
7. run dependency install under recorded transaction;
8. run verification.

## Rollback

On failure:

- restore backed-up files;
- remove newly created files owned by transaction;
- restore package manifests and lockfile;
- restore factory project/lock state;
- keep a recovery report when dependency-manager side effects cannot be perfectly reversed;
- never delete unrelated untracked user files.

## Failure injection tests

Inject failure:

- before first write;
- after Nth file;
- after package manifest edit;
- after dependency install;
- during generated sync;
- during verification;
- during rollback itself.

## Concurrency

A project lock contains process/time metadata. Stale lock recovery is explicit and safe. Concurrent mutating commands fail with `PF_PROJECT_LOCKED`.

## Atomicity limitation

Cross-platform filesystem and package installation cannot guarantee a true database-style transaction. The product must document this honestly and prove best-effort restoration with checksums and recovery reports.
