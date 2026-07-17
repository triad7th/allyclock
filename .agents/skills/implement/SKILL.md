---
name: implement
description: Implement a GitHub issue by number on a fresh feature branch with [#N] commits — the working step of the AllyClock ticket flow. Usage - /implement <issue-number>.
---

# Implement Issue

Take an issue from Ready to implemented-and-verified on a feature branch.
Ends at local review — never pushes; `/create-pr` is the next step.

## Constants

- Repo: `triad7th/allyclock` — Project: `8` (owner `triad7th`)
- Project ID: `PVT_kwHOALPoSc4BdoGX`
- Status field `PVTSSF_lAHOALPoSc4BdoGXzhYIU4E`: In progress `f8d99ecf`
- Board item lookup: `gh project item-list 8 --owner triad7th --format json --limit 200`,
  match `content.number` to the issue number.

## Steps

1. **Preflight.** `git status` must be clean and on `main`; then
   `git pull origin main`. If dirty or mid-branch, STOP and report — never
   mix a ticket with unrelated work.
2. **Read the ticket.** `gh issue view <N> -R triad7th/allyclock`. If the
   body links spec/plan docs, read them — they are the requirements. Re-read
   root `AGENTS.md`, especially the App guidance for the surface you will
   touch (web or iOS).
3. **Branch (auto-linked to the ticket).** Create it with
   `gh issue develop <N> -R triad7th/allyclock --name <type>/<N>-<short-slug> --base main --checkout`
   — this creates the branch on origin linked to the issue's Development
   section, then checks it out locally. `<type>` is `feat`, `fix`, or
   `chore` matching the issue label. (Fallback if `gh issue develop` is
   unavailable: `git checkout -b <type>/<N>-<short-slug>` — the PR's
   `Closes #N` still links the ticket at review time.)
4. **Board: In progress + assignee.** Ensure the ticket is assigned
   (`gh issue edit <N> -R triad7th/allyclock --add-assignee triad7th`),
   look up the board item id, then:

   ```bash
   gh project item-edit --id <ITEM_ID> --project-id PVT_kwHOALPoSc4BdoGX \
     --field-id PVTSSF_lAHOALPoSc4BdoGXzhYIU4E --single-select-option-id f8d99ecf
   ```

5. **Implement with TDD**, scaled to the ticket:
   - Small (XS/S): failing test → smallest change → focused tests, directly
     in this session.
   - Large (M+ with a linked plan): follow the plan task-by-task
     (superpowers:subagent-driven-development when the plan calls for it).
   - Web faces must look great in any dimension — validate portrait,
     landscape, and the face-picker preview size before calling UI work done.
6. **Verify** with the AGENTS.md matrix for the touched surfaces (web:
   `npm run test:web` / `lint:web` / `build:web`; iOS: `xcodebuild` build +
   test, SwiftLint/SwiftFormat) as applicable. Never claim green on a failed
   or incomplete run.
7. **Commit** as work naturally splits — multiple commits per ticket is
   normal. Message format:
   - Feature work: `[#N] <imperative subject>`
   - Support work: `[#N] chore: <subject>` (likewise `fix:`, `test:`,
     `docs:`)
   - Subjects all lowercase except proper nouns (GitHub, PR, SwiftUI,
     Angular, TestFlight)
   - Always append the session's standard commit trailers (Co-Authored-By +
     Claude-Session). Stage files explicitly — never `git add -A`, never
     `--no-verify`. If a commit hook fails: fix, re-stage, NEW commit
     (never `--amend`).
8. **Stop for review.** Report what changed, the verification evidence, and
   the commit list. Do NOT push. The user reviews locally, requests fixes
   (more `[#N]` commits), then runs `/create-pr`.
