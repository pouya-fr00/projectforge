# Documentation Standard

This project's documentation follows a progressive disclosure model.

## Audience-first writing

Every page should answer these questions in order:

1. **What** will the reader accomplish?
2. **Prerequisites** — what do they need installed or configured?
3. **Steps** — in order, with expected output.
4. **Next steps** — where to go after finishing.

## Command examples

Every code block must state:

- The working directory (implicit in the surrounding prose).
- Expected important output.
- Files that will be changed.
- How to undo or recover where relevant.

```bash
# Example from the project root:
cd my-app
projectforge add auth

# Expected output:
# Added modules: database-d1, auth
```

## Page types

### README / Landing

The fastest path to understanding and running the tool. Must have:

- One-line value proposition.
- Quickstart (5-minute flow).
- Above-the-fold clarity (no scrolling to understand what the tool does).

### Guides

Task-oriented. Each guide covers one complete workflow:

- Create a project
- Add modules

### Concepts

Understanding-oriented. Explains the "why" behind the tool:

- How the factory works
- Generated vs user-owned files
- Transactions and rollback

### Reference

Exhaustive, searchable facts:

- Every CLI command with all flags
- Every module with dependencies and description
- Every error code with cause and fix
- Every exit code with meaning

### Troubleshooting

Symptom-based navigation:

- Symptom → Cause → Check → Fix
- No vague advice (e.g., "try reinstalling" without diagnostic steps)
- Destructive actions clearly marked

## Error code template

Every public error code page must include:

- **Code:** `PF_...`
- **Meaning:** One-sentence explanation
- **Common causes:** Bullet list
- **Diagnostic command:** How to get more info
- **Fix:** Step-by-step, safe approach first
- **Destructive recovery:** If applicable, clearly marked and gated
- **See also:** Links to related commands or concepts

## Module page template

- **Purpose:** What the module provides
- **Dependencies:** What it installs transitively
- **Install:** Exact command
- **Dry-run:** Example `--dry-run` output
- **Files added:** List of key files
- **Packages added:** npm dependencies
- **Environment keys:** Required `.env` variables
- **Migrations:** SQL files included
- **Customization:** Where to extend safely
- **Generated files:** Which files the factory owns and updates
- **Security notes:** Auth, RBAC, secret handling
- **Verification:** How to test the module works
- **Known limitations:** Honest about V1 gaps

## Persian documentation (راهنمای فارسی)

- Commands and code blocks are **not translated** — keep them copy/paste-able.
- Technical terms use consistent Persian equivalents throughout.
- Right-to-left layout for prose, left-to-right for code.
- Future features are explicitly flagged as unavailable.

## Review checklist

Before a documentation change is complete:

- [ ] Every new command example has a corresponding automated test.
- [ ] Internal links resolve to existing pages.
- [ ] Sidebar and nav targets exist.
- [ ] No absolute local paths or user-specific data in docs.
- [ ] No future features presented as available.
- [ ] Code blocks have valid language tags.
- [ ] Persian guide has consistent terminology.
