# Windows Troubleshooting

This page covers issues observed on Windows during real Project Forge sessions.

## PowerShell and Command Prompt

Project Forge is tested under **Git Bash** and **PowerShell**. Command Prompt (`cmd.exe`) may work but is less reliable for glob patterns and path handling.

**Recommendation:** Use **PowerShell** or **Git Bash** as your terminal.

## Paths with spaces

Project paths containing spaces (e.g., `C:\Users\<user>\My Projects\my-app`) are fully supported:

```bash
projectforge create "my app"
```

Always quote paths containing spaces. The CLI normalizes them internally.

If a tool in the generated project fails on a spaced path, ensure its configuration uses quoted paths.

## `%TEMP%` directory

Clean-room tests and temporary project creation use `%TEMP%` (usually `C:\Users\<user>\AppData\Local\Temp`).

- Clean-room test directories are automatically removed after tests complete.
- If a session is interrupted, stale temp directories may remain. They are safe to delete manually.
- Path: `%TEMP%\pf-*` or `%TEMP%\projectforge-*`

## EPERM during cleanup

When a test or child process exits, Windows may briefly hold file handles. This can cause `EPERM` errors during cleanup:

```
Error: EPERM, Permission denied
```

**This is non-critical.** The cleanup function retries on next run. Stale temp directories do not affect the project.

**Do NOT** forcefully delete locked files with admin tools unless you are certain no process is using them.

## Files locked by editor or antivirus

If you see errors like:

```
EBUSY: resource busy or locked
```

**Likely causes:**

- An editor (VS Code, etc.) has the file open.
- Windows Defender or another antivirus is scanning the file.
- A terminal window is in the project directory.

**Fix:**

1. Close editor windows on the affected directory.
2. Wait a few seconds for antivirus scans to complete.
3. Move your terminal out of the directory before deleting it.

## CRLF vs LF

Project Forge templates use **LF** line endings. Windows editors may convert them to **CRLF**.

- Git's `core.autocrlf` may cause CRLF conversion on checkout. See [Git documentation](https://git-scm.com/docs/gitattributes) to configure.
- Template files are validated during pack integrity checks.
- If you see CRLF warnings, run: `git config core.autocrlf input`

## Running pnpm and Node

- **pnpm** must be installed via `corepack enable` or the standalone installer.
- **Node.js** v24+ is required. Check with `node --version`.
- Some native modules (like `better-sqlite3`) require build tools:
  - Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) with the "Desktop development with C++" workload.
  - Or install `windows-build-tools` via npm (deprecated; prefer VS Build Tools).

## Execution Policy

PowerShell may block script execution:

```
... cannot be loaded because running scripts is disabled on this system
```

**This is a PowerShell safety feature, not a Project Forge bug.**

You can allow scripts for the current session only:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

**Do NOT** permanently disable the execution policy (`Unrestricted`) unless you understand the security implications.

## Native dependency errors (better-sqlite3)

The `better-sqlite3` package used by `test-utils` requires native compilation. On Windows this needs:

1. **Visual Studio Build Tools** with C++ support (see above).
2. **Python 3.x** (for `node-gyp`).

If `pnpm install` fails with a `better-sqlite3` error:

```bash
# Try rebuilding the native module
pnpm rebuild better-sqlite3
```

If the error persists, the module is only required for local testing — the production D1 binding does not need `better-sqlite3`.

## Cleaning temp files without deleting project files

To clean stale temp directories safely:

```powershell
# List temp directories matching the Project Forge pattern
Get-ChildItem $env:TEMP -Directory -Name -Filter "pf-*"

# Remove a specific directory (replace with actual name)
Remove-Item -Recurse -Force "$env:TEMP\pf-docs-123456"
```

**Always verify the directory name** before running `Remove-Item`. Deleting the wrong directory cannot be undone.

## Windows path separators vs VitePress

VitePress (the documentation site) uses POSIX-style `/` path separators. Windows-style `\` separators may cause issues in VitePress config files.

All Project Forge docs use `/` in sidebar links and internal references, regardless of the host OS.

## Network/VPN vs repository errors

If you see errors like:

```
ERR_PNPM_FETCH_404
request to ... failed, reason: connect ETIMEDOUT
```

This is a network issue, **not** a Project Forge or repository error.

- Check your VPN connection.
- Verify npm registry access: `pnpm ping`
- Retry when the network is stable.

## Where to go next

- [Troubleshooting overview](/troubleshooting/) — common issues
- [Installation troubleshooting](/troubleshooting/installation) — pnpm and Node setup
- [Project lock troubleshooting](/troubleshooting/project-lock) — locked project recovery
