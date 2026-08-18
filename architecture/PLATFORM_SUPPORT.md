# Platform Support

## Required V1 environments

- Windows PowerShell on a supported Node release;
- Linux on a supported Node release;
- GitHub Actions Ubuntu runner.

macOS is best-effort until covered by CI or verified release testing.

## Shell independence

Core implementation uses Node APIs and structured child-process arguments. Public commands must not require Bash-only shell syntax.

## Package manager

V1 generated projects and the factory repository use pnpm. Detect unsupported package managers and explain the limitation rather than producing mixed lockfiles.

## Path testing

Test:

- spaces;
- Unicode;
- Persian characters;
- Windows separators;
- long paths within reasonable limits;
- case sensitivity differences;
- symlinks/junctions where supported.
