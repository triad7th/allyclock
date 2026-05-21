---
name: allyclock-ios-lint-format
description: Run SwiftLint and SwiftFormat for the AllyClock iOS app codebase. Use when the user asks to lint, format, clean up, check style, run SwiftLint, run SwiftFormat, or validate formatting for files under apps/ios.
---

# AllyClock iOS Lint Format

Lint and format the native iOS app under `apps/ios`.

## Workflow

1. Inspect state:
   - `git status --short`
   - `find apps/ios -maxdepth 2 -type f -name '*.swift' -print`
2. Confirm the iOS app exists:
   - If `apps/ios` does not exist, stop and report that the iOS app has not been scaffolded yet.
   - If `apps/ios/.swiftlint.yml` or `apps/ios/.swiftformat` is missing, run only the available tool and report the missing config.
3. Format Swift code:
   - Preferred command: `cd apps/ios && swiftformat AllyClock AllyClockTests`
   - If the test target does not exist yet: `cd apps/ios && swiftformat AllyClock`
4. Lint Swift code:
   - Preferred command: `cd apps/ios && swiftlint`
   - If SwiftLint is not installed, report the missing binary and do not invent a replacement.
5. Verify:
   - Run `git diff --check`.
   - Run `git status --short` and report changed files.

## Rules

- Do not format Web files or root docs unless the user explicitly asks.
- Do not add or change SwiftLint/SwiftFormat rules unless the user asks for config changes.
- Do not stage or commit changes unless the user explicitly asks.
- If formatting changes files, summarize the changed paths.

## Final Response

Report:

- Commands run.
- Whether formatting changed files.
- SwiftLint result.
- Any missing tools or missing iOS scaffold/config files.
