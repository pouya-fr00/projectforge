# Privacy and Telemetry

## V1 rule

No telemetry collection.

The CLI may perform only network activity explicitly required by the user's selected package manager or official package source. It does not send project names, module choices, file paths, source code, errors, or machine data to the maintainer.

## Logging

- default logs exclude environment values;
- JSON output excludes absolute home paths where possible;
- debug bundles require explicit command and show included files;
- test fixtures use synthetic paths;
- CI logs are reviewed for secrets.

## Future telemetry

Any future telemetry requires:

- separate owner-approved ADR;
- explicit opt-in;
- public schema;
- data minimization;
- disable command;
- retention policy;
- no source code or project path collection.
