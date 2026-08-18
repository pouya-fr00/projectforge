# Exit Codes

Project Forge uses stable exit codes for programmatic consumption. Never parse stdout/stderr to determine success or failure.

| Exit Code | Constant | Meaning |
|-----------|----------|---------|
| 0 | `SUCCESS` | Command completed successfully |
| 1 | `PROJECT_ERROR` | Expected project, config, module, or path error |
| 2 | `USAGE_ERROR` | Invalid CLI usage, missing arguments |
| 3 | `VERIFICATION_FAILURE` | Verification failed but rollback succeeded |
| 4 | `ROLLBACK_FAILURE` | Rollback failed, recovery report available |
| 5 | `INTERNAL_DEFECT` | Unexpected internal error |

## Error Code to Exit Code Mapping

| Error Code | Exit Code |
|------------|-----------|
| `PF_MODULE_NOT_FOUND` | 1 |
| `PF_INCOMPATIBLE_VERSION` | 1 |
| `PF_CYCLIC_DEPENDENCY` | 1 |
| `PF_MODULE_CONFLICT` | 1 |
| `PF_DUPLICATE_MODULE` | 1 |
| `PF_DUPLICATE_MIGRATION` | 1 |
| `PF_USER_MODIFIED_MANAGED_FILE` | 1 |
| `PF_PATH_ESCAPE` | 1 |
| `PF_NOT_A_PROJECT` | 1 |
| `PF_PROJECT_LOCKED` | 1 |
| `PF_STARTER_NOT_FOUND` | 1 |
| `PF_PROJECT_EXISTS` | 1 |
| `PF_SCHEMA_INVALID` | 1 |
| `PF_REGISTRY_INVALID_MANIFEST` | 1 |
| `PF_REGISTRY_DUPLICATE_ID` | 1 |
| `PF_REGISTRY_LOAD_FAILED` | 1 |
| `PF_LOCK_INVALID` | 1 |
| `PF_LOCK_READ_FAILED` | 1 |
| `PF_LOCK_WRITE_FAILED` | 1 |
| `PF_PROJECT_READ_FAILED` | 1 |
| `PF_PROJECT_WRITE_FAILED` | 1 |
| `PF_EXECUTION_FAILED` | 1 |
| `PF_VERIFICATION_FAILED` | 3 |
| `PF_ROLLBACK_FAILED` | 4 |
| `PF_MISSING_ARGUMENT` | 2 |
| *Unknown code* | 5 |
