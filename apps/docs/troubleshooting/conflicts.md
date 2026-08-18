# Conflict Troubleshooting

## `PF_MODULE_CONFLICT`

**Meaning:** The requested modules explicitly conflict with each other.

**Check:**
```bash
projectforge list --json
```

**Safe fix:** Choose one of the conflicting modules. Review the module catalog to understand what each provides and which best fits your needs.

## `PF_CYCLIC_DEPENDENCY`

**Meaning:** Modules form a circular dependency chain (A → B → A).

**Check:**
```bash
projectforge plan <module> --json
```

**Safe fix:** This is typically a registry configuration issue. If using official modules, report it. If using custom modules, review their `requires` fields and break the cycle.

## `PF_DUPLICATE_MODULE`

**Meaning:** The same module was specified multiple times.

**Fix:** Remove duplicate module names from your command.

## `PF_DUPLICATE_MIGRATION`

**Meaning:** Two modules include a migration with the same filename.

**Check:**
```bash
projectforge plan <module1> <module2> --json
```

**Fix:** Choose non-conflicting modules, or rename one of the migrations in the module's template directory.
