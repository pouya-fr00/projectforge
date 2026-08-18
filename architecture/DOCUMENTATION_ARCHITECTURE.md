# Documentation Architecture

Use progressive disclosure.

## README

Answers in this order:

1. What is it?
2. Who is it for?
3. What problem does it solve?
4. Five-minute quickstart.
5. What changes will it make?
6. Human and automation paths.
7. Supported stack/modules.
8. Links to deeper docs.

## Documentation site sections

```text
Start
  Introduction
  Requirements
  Quickstart
  Choose modules

Guides
  Create a project
  Add modules
  Customize safely
  CI usage

Concepts
  How the factory works
  Generated vs user-owned files
  Transactions and rollback
  Module dependencies
  Lockfile and provenance

Reference
  CLI
  Config schema
  Module catalog
  Error codes
  Exit codes

Troubleshooting
  Installation
  Project lock
  Conflicts
  Verification
  Auth/database
  Windows

Contributing
  Development setup
  Module authoring
  Documentation standard
  Release process
```

## Navigation rule

A user should never need to read architecture docs to complete the quickstart.
