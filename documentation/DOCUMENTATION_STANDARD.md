# Documentation Standard

Documentation is release-blocking product code.

## Audience-first writing

Each page begins with:

- what the reader will accomplish;
- prerequisites;
- expected time or number of steps only when verified;
- whether commands mutate files.

## Command examples

Every command block must state:

- working directory;
- expected important output;
- files changed;
- next command;
- how to undo or recover where relevant.

Examples must be copied into automated documentation tests, not manually duplicated without verification.

## Progressive disclosure

- README: fastest path.
- Guides: tasks.
- Concepts: understanding.
- Reference: exhaustive facts.
- Troubleshooting: symptom → cause → check → fix.

## Error documentation

Every public error code has:

- meaning;
- common causes;
- diagnostic command;
- safe fix;
- destructive actions clearly marked;
- link back to command reference.

## Module page template

- purpose;
- capabilities;
- prerequisites/dependencies;
- install command;
- dry-run example;
- files/packages/env/migrations added;
- customization points;
- generated files;
- security notes;
- verification;
- known limitations.

## Usability gate

At least two people or clean-slate simulated users follow docs without private maintainer context. All confusion is recorded and fixed before release.
