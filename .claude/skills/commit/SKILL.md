---
name: commit
description: Group AllyClock working-tree changes into logical commits with branch-aware message format ([#N] on a feature branch, conventional on main). Never pushes.
---

# Commit

Turn the current working tree into clean, logically grouped commits.

## Steps

1. **Inspect** (in parallel): `git diff --cached`, `git diff`, `git status`,
   `git log --oneline -5`. Note the current branch.
2. **If changes are already staged:** commit only what is staged (skip
   grouping).
3. **Otherwise group** changed files into 1–4 logical commits by concern —
   moderate splitting, not exhaustive:
   - Bug fixes separate from new features
   - Web changes separate from iOS changes when they are independent
   - Config/build/CI changes separate from app logic
   - Tests separate from implementation (only if substantial)
   - Never stage `.env`, secrets, or large binaries; never `git add -A`
4. **Message format is branch-aware:**
   - On `feat/N-*`, `fix/N-*`, or `chore/N-*`: `[#N] <imperative subject>`
     for feature work; `[#N] chore: <subject>` for support work (likewise
     `fix:`, `test:`, `docs:`). Subjects all lowercase except proper nouns
     (GitHub, PR, SwiftUI, Angular, TestFlight).
   - On `main` or any non-ticket branch: conventional format —
     `<type>(<scope>): <subject>` (`feat:`, `fix:`, `refactor:`, `chore:`,
     `test:`, `docs:`, `style:`); common scopes are `web`, `ios`, `core`,
     `ci`, `deps`.
   - Subject ≤ 72 chars; add 2–4 body bullets when the change is not
     self-evident; always append the session's standard commit trailers
     (Co-Authored-By + Claude-Session).
5. **Commit each group sequentially.** There is no pre-commit hook in this
   repo — formatting is on the author: for web changes run
   `npm run format:check:web` (and `format:web` to fix) before committing;
   for iOS changes SwiftFormat/SwiftLint via `/lint-and-format`. Never
   `--amend` a pushed commit, never `--no-verify`.
6. **Report** each commit hash + subject. Do NOT push (that is
   `/commit-and-push`).
