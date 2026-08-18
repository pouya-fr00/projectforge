# Error Model

## Error shape

```json
{
  "code": "PF_MODULE_CONFLICT",
  "message": "admin-dashboard requires rbac, but the selected configuration excludes it.",
  "details": {
    "module": "admin-dashboard",
    "required": ["rbac"]
  },
  "nextActions": [
    "Add rbac to the plan",
    "Run project-factory explain admin-dashboard"
  ],
  "docs": "/troubleshooting/PF_MODULE_CONFLICT"
}
```

## Required error families

- CLI usage;
- unsupported runtime/package manager;
- project not found;
- invalid project state;
- unknown starter/module;
- compatibility failure;
- dependency cycle;
- module conflict;
- file ownership conflict;
- generated drift;
- project locked;
- path safety violation;
- package install failure;
- verification failure;
- rollback failure;
- unsupported schema version;
- internal defect.

## UX rule

Never output only a stack trace for expected errors. Debug traces are opt-in.
