---
name: create-issue
description: Create a GitHub issue for a new AllyClock feature, fix, or chore and add it to the Kanban board (Status Ready). Run at the end of a brainstorm, or directly for ad-hoc bugs and tasks.
---

# Create Issue

Create the GitHub issue that becomes the unit of work for the ticket flow
(`/implement` → `/create-pr` → `/approve-pr`).

## Constants

- Repo: `triad7th/allyclock` — Project: `8` (owner `triad7th`)
- Project ID: `PVT_kwHOALPoSc4BdoGX`
- Status field `PVTSSF_lAHOALPoSc4BdoGXzhYIU4E`: Backlog `7829fad6`, Ready
  `46a07620`, In progress `f8d99ecf`, In review `05fc3981`, Done `c36f87de`
- Priority field `PVTSSF_lAHOALPoSc4BdoGXzhYIU8s`: P0 `399c5208`, P1
  `71f34567`, P2 `18d68ab1`
- Size field `PVTSSF_lAHOALPoSc4BdoGXzhYIU8w`: XS `86131849`, S `9b591865`,
  M `09c93e4c`, L `82a714a8`, XL `3a10f5dd`

If an `item-edit` call fails, the IDs may have changed — re-derive them with
`gh project field-list 8 --owner triad7th --format json` and continue.

## Steps

1. **Compose the issue.** Title: short, imperative. Body scales with size:
   - Small feature/fix: the body IS the spec — a Goal line plus concrete
     acceptance criteria (checkboxes).
   - Large feature: link the approved design/plan docs in
     `docs/superpowers/specs/` and `docs/superpowers/plans/`; the body holds
     the one-paragraph summary and the doc links.
2. **Confirm with the user** (title + body + label + proposed Priority/Size)
   before creating. Label: `enhancement`, `bug`, or `documentation`.
3. **Create and board it:**

   ```bash
   gh issue create -R triad7th/allyclock --title "<title>" --label "<label>" --assignee triad7th --body "<body>"
   gh project item-add 8 --owner triad7th --url <issue-url> --format json   # note the item id
   gh project item-edit --id <ITEM_ID> --project-id PVT_kwHOALPoSc4BdoGX \
     --field-id PVTSSF_lAHOALPoSc4BdoGXzhYIU4E --single-select-option-id 46a07620   # Status: Ready
   ```

   Set Priority and Size the same way with their field/option IDs.

4. **Report** the issue number and URL. The number is the handle for
   `/implement <N>` and every `[#N]` commit after it.
