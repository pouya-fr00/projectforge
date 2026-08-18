#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { commands, createOutput, parseArgs, ExitCode, mapErrorToExitCode } from '../dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// When running from the monorepo source tree, the registry lives under
// packages/registry/.  When shipped as a package, the bundled registry is
// copied into dist/bundled/ beside the compiled JS.  We prefer the source
// tree path when it exists so developers see live manifest edits.
const SOURCE_REGISTRY = path.resolve(__dirname, '..', '..', 'registry');
const BUNDLED_REGISTRY = path.resolve(__dirname, '..', 'dist', 'bundled');
const DEFAULT_REGISTRY_PATH = fs.existsSync(SOURCE_REGISTRY) ? SOURCE_REGISTRY : BUNDLED_REGISTRY;

const CLI_VERSION = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
).version;

const HELP_TEXT = `Project Factory CLI — projectforge v${CLI_VERSION}

Usage: projectforge <command> [options] [args...]

Commands:
  create <name> [starter]      Create a new project
  add <module...>             Add modules to the current project
  sync                        Sync current project with config
  status                      Show project status
  doctor                      Diagnose project and registry
  plan <module...>            Show plan for requested modules
  list                        List available starters and modules
  explain <module...>         Explain plan for requested modules
  upgrade --check             Check for available upgrades
  help                        Show this help message

Global options:
  -h, --help                  Show help
  -V, --version               Show version
  -j, --json                  Output JSON envelope
      --no-color              Disable colored output
  -v, --verbose               Verbose output
      --cwd <path>            Use <path> as the working directory
      --dry-run               Plan only; do not modify files or install packages
      --no-install            Skip installation and verification. Dependencies are still declared in package.json.
`;

function showVersion() {
  console.log(CLI_VERSION);
}

function showHelp() {
  console.log(HELP_TEXT);
}

async function main() {
  const rawArgs = process.argv.slice(2);

  // Handle top-level help/version before parsing subcommand details.
  if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
    showHelp();
    process.exitCode = ExitCode.SUCCESS;
    return;
  }
  if (rawArgs.includes('--version') || rawArgs.includes('-V')) {
    showVersion();
    process.exitCode = ExitCode.SUCCESS;
    return;
  }

  let parsed;
  try {
    parsed = parseArgs(rawArgs);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Invalid usage: ${message}`);
    process.exit(ExitCode.USAGE_ERROR);
  }

  const registryPath = process.env.PROJECTFORGE_REGISTRY || DEFAULT_REGISTRY_PATH;
  const out = createOutput({ json: parsed.json, command: parsed.command });

  const command = commands[parsed.command] || commands.help;

  try {
    const exitCode = await command({
      args: parsed.positional,
      cwd: parsed.cwd,
      json: parsed.json,
      noColor: parsed.noColor,
      verbose: parsed.verbose,
      dryRun: parsed.dryRun,
      noInstall: parsed.noInstall,
      out,
      registryPath,
    });

    out.flush(parsed.command, exitCode);
    process.exitCode = exitCode;
  } catch (err) {
    const mapping = mapErrorToExitCode(err);
    out.error(err);
    out.flush(parsed.command, mapping.exitCode);
    process.exitCode = mapping.exitCode;
  }
}

main().catch((err) => {
  console.error(err);
  if (process.exitCode === undefined || process.exitCode === 0) {
    process.exitCode = ExitCode.INTERNAL_DEFECT;
  }
});
