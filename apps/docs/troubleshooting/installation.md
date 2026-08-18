# Installation Troubleshooting

## `command not found: projectforge`

**Meaning:** The CLI is not installed or not on your PATH.

**Check:**
```bash
which projectforge
npx projectforge --version
```

**Fix:**
```bash
npm install -g projectforge
```

## Unsupported Node.js version

**Meaning:** Node.js version is below the minimum (20.x).

**Check:**
```bash
node --version
```

**Fix:** Install Node.js 20.x or 22.x from [nodejs.org](https://nodejs.org).

## `pnpm: command not found`

**Meaning:** pnpm is not installed.

**Fix:**
```bash
npm install -g pnpm
```

## Build script failure during `npm install`

**Meaning:** A native module (like `better-sqlite3`) failed to compile.

**Check:** Look for the specific error in the install output.

**Fix:**
- Ensure you have a C++ compiler (Windows: Visual Studio Build Tools; Linux: `build-essential`).
- Try `pnpm install --force`.
