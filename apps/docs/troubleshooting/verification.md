# Verification Troubleshooting

## `PF_VERIFICATION_FAILED`

**Meaning:** A verification command (typecheck, test, or build) failed after applying changes. The project was rolled back — no changes were persisted.

**Check the failure:**
```bash
pnpm run typecheck
pnpm run test
pnpm run build
```

**Common causes:**

- **Type errors in generated code** — this is a bug in the module or starter. Report it with the exact error output.
- **Missing dependencies** — the module may need additional packages. Check the module documentation.
- **Configuration mismatch** — your `tsconfig.json` or `vitest.config.ts` may need updating.

**Safe fix:**

1. Review the verification error output.
2. Fix the underlying issue manually, or report the module bug.
3. Re-run the `projectforge add` command.

## Verification runs before install

**Meaning:** The verification commands ran before `pnpm install` completed.

**Check:** Run `pnpm install` manually, then re-run `projectforge add`.

## Incompatible TypeScript version

**Meaning:** Your project's TypeScript version doesn't match the module's requirements.

**Check:**
```bash
pnpm list typescript
```

**Fix:** Update TypeScript to match the module's expected version.
