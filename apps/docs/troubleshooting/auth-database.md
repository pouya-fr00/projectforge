# Auth / Database Troubleshooting

## Missing `BETTER_AUTH_SECRET`

**Meaning:** The auth secret environment variable is not set.

**Check:**
```bash
echo $BETTER_AUTH_SECRET
```

**Fix:**
```bash
cp .env.example .env
# Generate a random secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste it into .env as BETTER_AUTH_SECRET=<value>
```

⚠️ **Never commit `.env` to version control.**

## Auth origin mismatch

**Meaning:** `BETTER_AUTH_URL` doesn't match the actual request origin.

**Check:** The auth URL in `.env` should match your development server URL (typically `http://localhost:5173`).

**Fix:** Update `BETTER_AUTH_URL` in `.env`.

## Database migration failure

**Meaning:** The migration runner failed to apply SQL migrations.

**Check:**
```bash
node migrations/runner.mjs
```

**Common causes:**
- Malformed SQL in a migration file
- Migration file naming conflict
- Database file permission issue

**Safe fix:**
1. Review the migration error output.
2. If using local SQLite, delete `local.db` and re-run:
   ```bash
   rm local.db
   node migrations/runner.mjs
   ```
3. In production (D1), use `wrangler d1 execute` with `--local` for testing.

## CORS errors in browser

**Meaning:** The browser blocks API requests due to cross-origin restrictions.

**Check:** Open browser developer tools → Network tab → look for CORS errors.

**Common causes:**
- `BETTER_AUTH_URL` not set correctly
- API server running on a different port than expected
- Origin header missing in the request

**Fix:**
1. Ensure `BETTER_AUTH_URL` matches your web app URL.
2. Ensure the API server includes appropriate CORS headers.
3. For development, the default configuration allows `http://localhost:5173`.
