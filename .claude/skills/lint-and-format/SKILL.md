---
name: lint-and-format
description: Lint and format the AllyClock surfaces - ESLint + Prettier for the Angular web app, SwiftLint + SwiftFormat for the iOS app. Runs the surfaces that changed (or both on request) and reports what changed and what remains.
---

# Lint and Format

Lint first, then format — so lint auto-fixes land before the formatter
normalizes the final style, and the tree always ends formatted. Run
sequentially (AllyDrive: never run heavy Angular jobs concurrently).

Pick surfaces by what changed (`git status --short`): web files → Web pass,
`apps/ios` files → iOS pass, both or an explicit "lint everything" → both.

## Web pass (apps/web)

1. **Lint:**

   ```bash
   npm run lint:web
   ```

2. **Auto-fixables:** if the output says problems are fixable, run
   `npm --prefix apps/web run lint:fix`, then re-run the plain lint to show
   what remains.

3. **Format (always last):**

   ```bash
   npm run format:web        # prettier --write over src/**
   ```

   Note which files Prettier rewrote (`git status --short`).

## iOS pass (apps/ios)

1. **Format:**

   ```bash
   cd apps/ios && swiftformat AllyClock AllyClockTests
   ```

2. **Lint:**

   ```bash
   cd apps/ios && swiftlint
   ```

   If SwiftLint or SwiftFormat is not installed, report the missing binary
   and do not invent a replacement.

## Report

Per-surface lint error/warning counts with file:line for each remaining
problem, what was auto-fixed, and which files were reformatted. Do NOT
commit — that is `/commit` or `/commit-and-push`.
