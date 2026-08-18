export interface ParsedArgs {
  command: string;
  positional: string[];
  cwd: string;
  json: boolean;
  noColor: boolean;
  verbose: boolean;
  dryRun: boolean;
  noInstall: boolean;
  help: boolean;
  version: boolean;
  raw: string[];
}

function takeFlag(args: string[], short: string, long: string): { found: boolean; rest: string[] } {
  let found = false;
  const rest: string[] = [];
  for (const arg of args) {
    if (arg === short || arg === long) {
      found = true;
    } else {
      rest.push(arg);
    }
  }
  return { found, rest };
}

function takeValue(args: string[], long: string): { value?: string; rest: string[] } {
  const rest: string[] = [];
  let value: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === long) {
      if (i + 1 < args.length) {
        value = args[i + 1];
        i++;
      }
    } else if (arg.startsWith(`${long}=`)) {
      value = arg.slice(long.length + 1);
    } else {
      rest.push(arg);
    }
  }
  return { value, rest };
}

export function parseArgs(raw: string[]): ParsedArgs {
  let working = [...raw];

  const json = takeFlag(working, '-j', '--json').found;
  working = takeFlag(working, '-j', '--json').rest;

  const noColor = takeFlag(working, '', '--no-color').found;
  working = takeFlag(working, '', '--no-color').rest;

  const verbose = takeFlag(working, '-v', '--verbose').found;
  working = takeFlag(working, '-v', '--verbose').rest;

  const dryRun = takeFlag(working, '', '--dry-run').found;
  working = takeFlag(working, '', '--dry-run').rest;

  const noInstall = takeFlag(working, '', '--no-install').found;
  working = takeFlag(working, '', '--no-install').rest;

  const help = takeFlag(working, '-h', '--help').found;
  working = takeFlag(working, '-h', '--help').rest;

  const version = takeFlag(working, '-V', '--version').found;
  working = takeFlag(working, '-V', '--version').rest;

  const cwdResult = takeValue(working, '--cwd');
  const cwd = cwdResult.value ?? process.cwd();
  working = cwdResult.rest;

  const positional = working.filter((a) => !a.startsWith('--'));
  const command = positional[0] || 'help';

  return {
    command,
    positional: positional.slice(1),
    cwd,
    json,
    noColor,
    verbose,
    dryRun,
    noInstall,
    help,
    version,
    raw: working,
  };
}
