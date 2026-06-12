---
name: allyclock-web-lint-format
description: Run ESLint and Prettier for the AllyClock Web app codebase. Use when the user asks to lint, format, clean up, check style, run ESLint, run Prettier, or validate formatting for files under apps/web.
---

# AllyClock Web Lint Format

Lint and format the Angular web app under `apps/web`.

## Workflow

1. Inspect state:
   - `git status --short`
   - `find apps/web/src -type f \( -name '*.ts' -o -name '*.html' -o -name '*.scss' \) -print | head -20`
2. Confirm the web app exists:
   - If `apps/web` does not exist, stop and report that the web app has not been scaffolded yet.
   - If `apps/web/eslint.config.js` is missing, skip ESLint and report the missing config.
3. Format code with Prettier:
   - Preferred command (from repo root): `npm --prefix apps/web run format`
   - This formats `src/**/*.{ts,html,scss,json}` in place.
   - If Prettier is not installed, report the missing binary and do not invent a replacement.
4. Lint with ESLint:
   - Preferred command (from repo root): `npm --prefix apps/web run lint`
   - This runs `ng lint` via angular-eslint over all `src/**/*.ts` and `src/**/*.html` files.
   - If ESLint reports errors, show them; do not auto-fix unless the user asks.
5. Verify:
   - Run `git diff --check`.
   - Run `git status --short` and report changed files.

## Rules

- Do not format iOS files or root docs unless the user explicitly asks.
- Do not add or change ESLint or Prettier rules unless the user asks for config changes.
- Do not stage or commit changes unless the user explicitly asks.
- If formatting changes files, summarize the changed paths.
- Run Prettier (format) before ESLint (lint) — formatted code lints cleanest.

## Final Response

Report:

- Commands run.
- Whether Prettier changed files.
- ESLint result (pass or list of errors/warnings).
- Any missing tools or missing web scaffold/config files.
