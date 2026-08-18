# Project Lock Troubleshooting

## `PF_PROJECT_LOCKED`

**Meaning:** Another Project Forge process is modifying the project, or a previous process crashed without cleaning up.

**Check:**
```bash
ls -la projectforge.lock
```

**Safe fix:**
1. Ensure no other Project Forge process is running:
   ```bash
   ps aux | grep projectforge
   ```
2. If the lock is stale (file older than 5 minutes), delete it:
   ```bash
   rm projectforge.lock
   ```

## Stale Transaction Detection

**Meaning:** A previous command was interrupted, leaving the project in an incomplete state.

**Check:**
```bash
projectforge doctor
```

**Fix:** Run `projectforge doctor` to detect and recover. If a recovery report exists at `.projectforge/recovery-report.json`, review it for manual steps.
