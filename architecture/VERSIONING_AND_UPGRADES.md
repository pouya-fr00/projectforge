# Versioning and Upgrades

## Semantic versioning

Apply SemVer to:

- CLI/engine;
- registry package;
- starter;
- each module;
- public JSON output schemas.

## V1 upgrade capability

`upgrade --check` reports:

- available compatible versions;
- engine/starter/module requirements;
- changed source-owned files;
- generated files safe to regenerate;
- migration requirements;
- manual steps.

V1 does not automatically merge user-modified source-owned module files.

## Generated files

Generated integration files can be regenerated when their current checksum matches an expected generated state or when a deterministic preview is accepted.

## Customized files

If a source-owned file differs from its original checksum, upgrade check labels it customized and provides a diff source/reference. It never overwrites it automatically.

## Breaking changes

Require:

- migration guide;
- state schema migrator where possible;
- example upgrades;
- release notes;
- explicit major version.
