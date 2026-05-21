---
name: allyclock-auto-commit
description: Automatically review, group, validate, stage, and commit AllyClock repository changes using consistent commit names and descriptions. Use when the user asks to auto commit, commit current changes, create well-structured commits, split changes into multiple commits, or prepare commits for Web, iOS, shared, CI, docs, dependency, or repo tooling changes.
---

# AllyClock Auto Commit

Commit current AllyClock changes with deliberate grouping and a consistent message style.

## Workflow

1. Inspect the worktree:
   - `git status --short`
   - `git diff --stat`
   - `git diff`
   - Include staged changes with `git diff --cached --stat` and `git diff --cached` when present.
2. Identify changed files and classify them by scope:
   - `web`: Angular/Web app changes (`apps/web/**`; before monorepo migration also `src/**`, `public/**`, `angular.json`, `tsconfig*.json` when clearly Web-related)
   - `ios`: iOS app changes (`apps/ios/**`, Xcode project/workspace files, Swift files)
   - `core`: shared product logic/data (`packages/core/**`, shared timezone/region data)
   - `ci`: GitHub Actions or deployment automation (`.github/**`)
   - `docs`: documentation-only changes
   - `deps`: dependency manifest/lockfile changes
   - `test`: test-only infrastructure or fixtures
   - `repo`: repository tooling, agent, config, or structure changes
3. Split commits by logical intent, not by file type:
   - Keep source changes and their matching tests in the same commit.
   - Keep dependency manifest and lockfile updates in the same commit.
   - Separate unrelated scopes, for example Web UI work and iOS project setup.
   - Separate mechanical formatting from behavior changes when both are present.
   - Separate CI/deployment changes from application behavior unless they are required by the same change.
4. Avoid unsafe partial commits:
   - Stage explicit paths, not `git add .`, unless all changed files belong to the same intended commit.
   - Do not stage unrelated user changes.
   - If one file contains multiple unrelated changes, only split it when the hunks are clearly separable with non-interactive commands. Otherwise create one broader commit or ask the user before proceeding.
   - Never rewrite history or amend existing commits unless the user explicitly asks.
5. Validate before committing:
   - For Web changes, prefer `npm run lint:web`, `npm run check:web`, or the closest available repo script. In the current flat Angular app, use available scripts such as `npm test -- --watch=false` or `npm run build` when appropriate.
   - For iOS changes, prefer `npm run lint:ios`, `npm run check:ios`, `swiftlint`, `swiftformat --lint .`, or `xcodebuild test` from the iOS app directory when available.
   - For docs-only changes, validation may be skipped.
   - If a relevant validation command is unavailable, note that in the final response.
   - If validation fails, stop before committing unless the user explicitly asks to commit failing work.
6. Commit each group independently:
   - Stage only that group.
   - Run `git diff --cached --stat` and confirm it matches the intended group.
   - Commit with the message format below.
   - Continue with the next group until all intended changes are committed.

## Commit Message Style

Use this exact structure:

```text
<scope>: <imperative summary>

Why:
- <reason this change exists>

What:
- <specific user-visible or code-level change>
- <another concrete change when useful>

Checks:
- <command>: <passed|failed|skipped and reason>
```

Rules:

- Use one scope: `web`, `ios`, `core`, `ci`, `docs`, `deps`, `test`, or `repo`.
- Summary is imperative, lowercase after the scope when natural, 72 characters or fewer, and has no trailing period.
- Body bullets are concise and factual.
- Use `skipped` only when checks are not relevant or the repo lacks the command.
- Do not include generated marketing language.

Examples:

```text
web: fix clock card interval cleanup

Why:
- Clock cards should not leave timers running after component teardown.

What:
- Add an explicit one-second interval delay.
- Clear the interval in the component destroy lifecycle.

Checks:
- npm test -- --watch=false: passed
```

```text
repo: add app-specific Codex commit workflow

Why:
- AllyClock needs consistent commits across Web, iOS, and shared code.

What:
- Add a reusable auto-commit skill with grouping rules.
- Define commit message structure and validation expectations.

Checks:
- not run: documentation-only agent workflow change
```

## Final Response

Report:

- Commit hashes and subjects created.
- Validation commands run and their result.
- Any remaining uncommitted files, especially files intentionally left out.
