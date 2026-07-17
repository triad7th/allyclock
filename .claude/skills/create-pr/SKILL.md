---
name: create-pr
description: Push the current AllyClock feature branch and open its pull request (Status In review). Run after locally reviewing /implement's work.
---

# Create PR

Publish the reviewed feature branch as a pull request tied to its issue.

## Constants

- Repo: `triad7th/allyclock` — Project: `8` (owner `triad7th`)
- Project ID: `PVT_kwHOALPoSc4BdoGX`
- Status field `PVTSSF_lAHOALPoSc4BdoGXzhYIU4E`: In review `05fc3981`
- Board item lookup: `gh project item-list 8 --owner triad7th --format json --limit 200`,
  match `content.number` to the issue number.

## Steps

1. **Preflight.** Current branch must match `<type>/<N>-*` (extract `N`);
   worktree clean (uncommitted work → run `/commit` first or stop and ask).
   Confirm the verification gate from `/implement` is still valid; if
   commits were added since, re-run the focused tests for what changed.
2. **Push.** `git push -u origin <branch>`.
3. **Open the PR:**

   ```bash
   gh pr create -R triad7th/allyclock \
     --title "[#N] <issue title>" \
     --body "$(cat <<'EOF'
   ## What
   <what changed, 2-5 bullets>

   ## Why
   <one or two sentences — the issue's goal>

   ## Test evidence
   <suites run + counts, e.g. web tests green, build:web clean, iOS build green>

   Closes #N

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```

   Also append the session URL line after the generated-with line, matching
   the session's standard PR footer.

4. **Board: In review.** Look up the item id, then `gh project item-edit`
   with option id `05fc3981`.
5. **Report** the PR URL. The user reviews the PR; review fixes are more
   `[#N]` commits on this branch pushed with `/commit-and-push` (the PR
   updates automatically). `/approve-pr <N>` finishes the ticket.
