# Troubleshooting Standard

## Entry format

```text
Error code / visible symptom
What it means
Most likely causes
How to confirm
Safe fix
Recovery data location
When to open an issue
Information to include (without secrets)
```

## Required topics

- command not found;
- unsupported Node/pnpm;
- project not detected;
- stale project lock;
- module conflict;
- customized target file;
- package install failure;
- verification failure;
- rollback failure;
- missing environment values;
- D1 migration/config issue;
- auth origin/cookie issue;
- Windows path issue;
- generated drift;
- schema version mismatch.

## Support bundle

If implemented, `doctor --report` must preview exactly what it will include and exclude source code/secrets by default.
