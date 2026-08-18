# Error Code Reference

Every error produced by Project Forge has a stable error code. Use these codes for automated handling — never parse human-readable error text.

## Error Categories

| Category | Exit Code | Examples |
|----------|-----------|----------|
| Success | 0 | — |
| Project Error | 1 | Module not found, conflict, invalid path |
| Usage Error | 2 | Missing argument, unknown command |
| Verification Failure | 3 | Verification command returned non-zero |
| Rollback Failure | 4 | Rollback failed, recovery report available |
| Internal Defect | 5 | Unexpected internal error |

---

## Error Codes

### `PF_MODULE_NOT_FOUND`

**Meaning:** The requested module does not exist in the registry.

**Common causes:** Typo in module ID, module not yet implemented, custom registry path mismatch.

**Diagnostic:** Run `projectforge list` to see available modules.

**Fix:** Correct the module ID or add the module to your registry.

---

### `PF_INCOMPATIBLE_VERSION`

**Meaning:** A module requires a newer engine version than the one installed.

**Common causes:** Module was built for a future version, engine is outdated.

**Diagnostic:** Check the module manifest `engine` field.

**Fix:** Update Project Forge or use a compatible module version.

---

### `PF_CYCLIC_DEPENDENCY`

**Meaning:** Modules form a dependency cycle (A requires B requires A).

**Common causes:** Misconfigured module manifests.

**Diagnostic:** Review the dependency chain in the plan output.

**Fix:** Break the cycle by removing one of the dependency edges.

---

### `PF_MODULE_CONFLICT`

**Meaning:** Two modules explicitly conflict with each other.

**Common causes:** Modules that provide overlapping functionality.

**Diagnostic:** Check module manifest `conflicts` fields.

**Fix:** Choose one of the conflicting modules.

---

### `PF_DUPLICATE_MODULE`

**Meaning:** The same module was requested more than once.

**Fix:** Remove duplicate module IDs from your command.

---

### `PF_DUPLICATE_MIGRATION`

**Meaning:** Two modules include a migration with the same filename.

**Common causes:** Modules with overlapping migration filenames.

**Diagnostic:** Check migration filenames in both module manifests.

**Fix:** Rename one of the migrations or choose non-conflicting modules.

---

### `PF_USER_MODIFIED_MANAGED_FILE`

**Meaning:** A factory-managed file was modified by the user. Sync/add will not overwrite it.

**Common causes:** Manual edits to generated files.

**Diagnostic:** The error includes the file path, expected checksum, and actual checksum.

**Fix:** Revert your manual changes, move custom code to a source-owned file, or document the intentional divergence.

---

### `PF_PATH_ESCAPE`

**Meaning:** A path attempts to escape outside the project root using `../` or an absolute path.

**Common causes:** Malicious or malformed module manifests, manual path input with traversal.

**Fix:** Use only relative paths within the project.

---

### `PF_NOT_A_PROJECT`

**Meaning:** The current directory is not a Project Forge project.

**Common causes:** Running a project-scoped command outside a project.

**Fix:** Navigate to a project directory or create one with `projectforge create`.

---

### `PF_PROJECT_LOCKED`

**Meaning:** Another process is modifying the project.

**Common causes:** Concurrent `projectforge` commands, crashed process left a stale lock.

**Diagnostic:** Check for a `projectforge.lock` file in the project root.

**Fix:** Wait for the other process to finish. If the lock is stale (older than 5 minutes), delete it.

---

### `PF_VERIFICATION_FAILED`

**Meaning:** A verification command (typecheck, test, build) returned a non-zero exit code.

**Common causes:** Generated code has type errors, tests fail, build is broken.

**Diagnostic:** Review the verification command output.

**Fix:** Fix the underlying issue and run again. The project was rolled back — no changes were persisted.

---

### `PF_ROLLBACK_FAILED`

**Meaning:** A transaction failed and the automatic rollback also failed. A recovery report was generated.

**Diagnostic:** Read the recovery report at the path shown in the output.

**Fix:** Follow the recovery report instructions to manually restore the project state.

---

### `PF_STARTER_NOT_FOUND`

**Meaning:** The requested starter does not exist in the registry.

**Diagnostic:** Run `projectforge list` to see available starters.

**Fix:** Use an available starter ID.

---

### `PF_PROJECT_EXISTS`

**Meaning:** The target directory for `create` is not empty.

**Fix:** Use an empty directory or a different project name.

---

### `PF_NOT_IMPLEMENTED`

**Meaning:** The requested command or feature is not yet implemented.

**Common command:** `upgrade --check`

**Fix:** Wait for a future release.
