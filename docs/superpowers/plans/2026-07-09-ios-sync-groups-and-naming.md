# iOS Synchronized Folder Groups + Naming Convention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `AllyClock.xcodeproj` to synchronized folder groups (files auto-join targets, no more hand-edited pbxproj IDs) and codify the Swift file naming scheme in `apps/ios/CLAUDE.md`.

**Architecture:** The pbxproj moves from objectVersion 56 with per-file `PBXBuildFile`/`PBXFileReference`/`PBXGroup` entries to objectVersion 77 with two `PBXFileSystemSynchronizedRootGroup`s (`AllyClock`, `AllyClockTests`) — the exact shape AllyPiano's project already uses. Behavior is provably unchanged: same sources compile, same tests pass, snapshot PNGs stay byte-identical.

**Tech Stack:** Xcode 26 project format (objectVersion 77), xcodebuild, XCTest + swift-snapshot-testing.

**Sibling plan:** AllyPiano gets the reverse convergence (naming/folders) in `/Volumes/AllyDrive/Storage/Repos/AllyPiano/docs/superpowers/plans/2026-07-09-ios-naming-convergence.md`. The two plans are independent; this one has no ordering constraint.

## Global Constraints

- Repo: `/Volumes/AllyDrive/Storage/Repos/allyclock`, branch off `main`. All commands below run from `apps/ios/` unless a path is shown.
- Other Claude sessions may have in-flight work in this repo. Before starting, `git status` must show no staged changes; stage ONLY the files this plan names — never `git add -A`.
- Do not touch `packages/AllyClockCore`, `apps/web`, deployment workflows, or the Alloy pin (`exactVersion 0.4.0` stays).
- Snapshot gate: reference PNGs under `AllyClockTests/__Snapshots__/` must remain byte-identical (`git diff --stat -- '*.png'` prints nothing) — this migration must not re-record anything.
- Verification commands (from `apps/ios/`):
  - Build: `xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17' build`
  - Test: `xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17' test`
  - Expected test result: `Test Suite 'All tests' passed` — 12 tests (FaceKindTests, FlagResolutionTests, FaceSnapshotTests).
- If a live Xcode has the default DerivedData locked, append `-derivedDataPath /tmp/allyclock-dd` to both commands (established workaround in this repo).
- Commits end with the two trailers used in Task 1 Step 6 (Co-Authored-By + Claude-Session).

## File Structure

```
apps/ios/AllyClock.xcodeproj/project.pbxproj   (Task 1: the whole migration)
apps/ios/CLAUDE.md                             (Task 2: conventions — sync groups + naming)
```

No Swift files change in this plan. AllyClock's existing file names already follow the convention being codified; the two historical deviations (`FacePickerView`, the `*SettingsView` normalization) are documented as sanctioned, not renamed.

---

### Task 1: Migrate project.pbxproj to synchronized folder groups

**Files:**
- Modify: `apps/ios/AllyClock.xcodeproj/project.pbxproj`

**Interfaces:**
- Consumes: the current pbxproj (objectVersion 56; object IDs `AC…0011` = app source group, `AC…0041` = tests source group — these IDs are REUSED as the synchronized root groups so the main group's children list needs no edit).
- Produces: a pbxproj where any `.swift` file created under `apps/ios/AllyClock/` or `apps/ios/AllyClockTests/` joins its target automatically. Task 2 documents this contract; every future task in this repo relies on it.

**Why this is safe:** synchronized root groups make the pbxproj stop enumerating files entirely — the folder on disk IS the target membership. AllyPiano's `project.pbxproj` is the proven template (same two-target shape, local package, tests with TEST_HOST). Resources are auto-included the same way: `Assets.xcassets` becomes an app resource, `Preview Content` stays governed by `DEVELOPMENT_ASSET_PATHS` (unchanged), and the `__Snapshots__/*.png` files become test-bundle resources — harmless, since SnapshotTesting locates references via `#filePath` on disk, not the bundle.

- [ ] **Step 1: Record the baseline**

Run (from `apps/ios/`):

```bash
git status --short                     # must be empty for apps/ios paths
xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17' test 2>&1 | tail -5
```

Expected: `** TEST SUCCEEDED **`. If the baseline is red, STOP and report — do not migrate on a broken base.

- [ ] **Step 2: Apply the pbxproj edits**

All edits are in `apps/ios/AllyClock.xcodeproj/project.pbxproj`. Section order in the file is alphabetical by section name; keep it that way.

**2a. Header:** change

```
	objectVersion = 56;
```

to

```
	objectVersion = 77;
```

**2b. `PBXBuildFile` section:** replace the entire section body so ONLY the four package-product entries remain:

```
/* Begin PBXBuildFile section */
		AC0000000000000000000102 /* AllyClockCore in Frameworks */ = {isa = PBXBuildFile; productRef = AC0000000000000000000101 /* AllyClockCore */; };
		AC0000000000000000000163 /* SnapshotTesting in Frameworks */ = {isa = PBXBuildFile; productRef = AC0000000000000000000162 /* SnapshotTesting */; };
		AC0000000000000000000172 /* AlloyTime in Frameworks */ = {isa = PBXBuildFile; productRef = AC0000000000000000000171 /* AlloyTime */; };
		AC0000000000000000000174 /* AlloyUI in Frameworks */ = {isa = PBXBuildFile; productRef = AC0000000000000000000173 /* AlloyUI */; };
/* End PBXBuildFile section */
```

(Deletes every `… in Sources` and `… in Resources` entry — 15 lines.)

**2c. `PBXFileReference` section:** replace the entire section body so ONLY the two product references remain:

```
/* Begin PBXFileReference section */
		AC0000000000000000000024 /* AllyClock.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = AllyClock.app; sourceTree = BUILT_PRODUCTS_DIR; };
		AC0000000000000000000051 /* AllyClockTests.xctest */ = {isa = PBXFileReference; explicitFileType = wrapper.cfbundle; includeInIndex = 0; path = AllyClockTests.xctest; sourceTree = BUILT_PRODUCTS_DIR; };
/* End PBXFileReference section */
```

**2d. New `PBXFileSystemSynchronizedRootGroup` section**, inserted between the `PBXFileReference` and `PBXFrameworksBuildPhase` sections (alphabetical order), reusing the old group IDs:

```
/* Begin PBXFileSystemSynchronizedRootGroup section */
		AC0000000000000000000011 /* AllyClock */ = {
			isa = PBXFileSystemSynchronizedRootGroup;
			path = AllyClock;
			sourceTree = "<group>";
		};
		AC0000000000000000000041 /* AllyClockTests */ = {
			isa = PBXFileSystemSynchronizedRootGroup;
			path = AllyClockTests;
			sourceTree = "<group>";
		};
/* End PBXFileSystemSynchronizedRootGroup section */
```

**2e. `PBXGroup` section:** replace the entire section body with just the main group and Products (the old `AC…0011` and `AC…0041` `PBXGroup` definitions and the `Preview Content`/`Shared`/`Faces`/`App` subgroups are deleted — `AC…0011`/`AC…0041` now live in the section from 2d):

```
/* Begin PBXGroup section */
		AC0000000000000000000002 /* AllyClock */ = {
			isa = PBXGroup;
			children = (
				AC0000000000000000000011 /* AllyClock */,
				AC0000000000000000000041 /* AllyClockTests */,
				AC0000000000000000000003 /* Products */,
			);
			sourceTree = "<group>";
		};
		AC0000000000000000000003 /* Products */ = {
			isa = PBXGroup;
			children = (
				AC0000000000000000000024 /* AllyClock.app */,
				AC0000000000000000000051 /* AllyClockTests.xctest */,
			);
			name = Products;
			sourceTree = "<group>";
		};
/* End PBXGroup section */
```

**2f. `PBXNativeTarget` — app target `AC…0010`:** insert a `fileSystemSynchronizedGroups` block after `dependencies = ( );`:

```
			dependencies = (
			);
			fileSystemSynchronizedGroups = (
				AC0000000000000000000011 /* AllyClock */,
			);
			name = AllyClock;
```

**2g. `PBXNativeTarget` — test target `AC…0040`:** insert after its `dependencies` block:

```
			dependencies = (
				AC0000000000000000000060 /* PBXTargetDependency */,
			);
			fileSystemSynchronizedGroups = (
				AC0000000000000000000041 /* AllyClockTests */,
			);
			name = AllyClockTests;
```

**2h. `PBXProject` section:** delete the line

```
			compatibilityVersion = "Xcode 14.0";
```

and add two attributes so the block reads (only the two new lines are added; `mainGroup` and `packageReferences` are unchanged):

```
			mainGroup = AC0000000000000000000002;
			minimizedProjectReferenceProxies = 1;
			packageReferences = (
				AC0000000000000000000100 /* XCLocalSwiftPackageReference "AllyClockCore" */,
				AC0000000000000000000161 /* XCRemoteSwiftPackageReference "swift-snapshot-testing" */,
				AC0000000000000000000170 /* XCRemoteSwiftPackageReference "Alloy" */,
			);
			preferredProjectObjectVersion = 77;
			productRefGroup = AC0000000000000000000003 /* Products */;
```

**2i. `PBXResourcesBuildPhase` — app phase `AC…0015`:** empty its files list:

```
		AC0000000000000000000015 /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
```

(The test phase `AC…0044` is already empty — leave it.)

**2j. `PBXSourcesBuildPhase` — both phases:** empty both files lists:

```
		AC0000000000000000000013 /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
		AC0000000000000000000042 /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
```

- [ ] **Step 3: Sanity-check the surgery**

```bash
grep -c "PBXBuildFile;" AllyClock.xcodeproj/project.pbxproj      # expect 4
grep -c "PBXFileReference;" AllyClock.xcodeproj/project.pbxproj  # expect 2
grep -c "fileSystemSynchronizedGroups" AllyClock.xcodeproj/project.pbxproj  # expect 2
grep -c "\.swift" AllyClock.xcodeproj/project.pbxproj            # expect 0
```

Expected: exactly 4 / 2 / 2 / 0. Any other count means an edit was missed — fix before building.

- [ ] **Step 4: Build**

Run: `xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17' build 2>&1 | tail -3`
Expected: `** BUILD SUCCEEDED **`. A missing-type compile error here means the synchronized group isn't picking up a folder — re-check 2d/2f.

- [ ] **Step 5: Test + snapshot byte-check**

```bash
xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 17' test 2>&1 | tail -5
git diff --stat -- '*.png'
```

Expected: `** TEST SUCCEEDED **` (12 tests) and NO png output from the diff. If any snapshot changed, the migration altered rendering — that is a defect in this task, not a re-record situation. Revert and diagnose.

- [ ] **Step 6: Commit**

```bash
git add AllyClock.xcodeproj/project.pbxproj
git commit -m "$(cat <<'EOF'
chore(ios): migrate pbxproj to synchronized folder groups

Files under AllyClock/ and AllyClockTests/ now join their targets
automatically (objectVersion 77, PBXFileSystemSynchronizedRootGroup —
the same shape as AllyPiano). No more hand-minted pbxproj IDs when
adding files. Sources, tests, and snapshots verified unchanged.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Duuvd6K4afii5rLwBbtmvn
EOF
)"
```

---

### Task 2: Codify conventions in apps/ios/CLAUDE.md

**Files:**
- Modify: `apps/ios/CLAUDE.md`

**Interfaces:**
- Consumes: Task 1's synchronized-groups contract (documents it).
- Produces: the "Swift File Naming & Layout" convention text — the AllyPiano convergence plan copies this scheme verbatim into its own CLAUDE.md task.

- [ ] **Step 1: Add the conventions**

In `apps/ios/CLAUDE.md`, append two bullets to the existing `## Conventions` list:

```markdown
- The Xcode project uses synchronized folder groups: any file added under `AllyClock/` or `AllyClockTests/` joins its target automatically. Never hand-edit `project.pbxproj` to add, move, or remove files — create/`git mv`/delete them on disk.
```

Then add a new section immediately after `## Conventions` (before the layout-debugging bullet's section ends — i.e., as the next `##` heading):

```markdown
## Swift File Naming & Layout

The web app (`apps/web`) is the porting reference; Swift files map from it mechanically:

- Web `<name>.component.ts` → `<Name>View.swift`. Every SwiftUI view type ends in `View` — including sheets (`AdjustSheetView`, never `AdjustSheet`).
- Web `<name>.ts` models/stores/logic (dropping `.service`/`.data` suffixes) → `<Name>.swift` (`DimensionRegistry`, `WorldCardsPresets`).
- Folders mirror the web top level: `layout/` → `App/`, `features/faces/` → `Faces/`, `shared/` → `Shared/`.
- One primary type per file; the file is named after that type.
- Sanctioned deviations (kept, not bugs): `FacePickerView` (web: `face-picker-sheet.component.ts`) and the `*SettingsView` pair normalizing web's inconsistent `fullscreen-config` / `world-cards-settings` names.
```

- [ ] **Step 2: Verify the harness symlink still serves both agents**

Run (from `apps/ios/`): `readlink AGENTS.md`
Expected: `CLAUDE.md` (the symlink means no second edit is needed).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs(ios): codify sync-group workflow and Swift naming scheme

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Duuvd6K4afii5rLwBbtmvn
EOF
)"
```

---

## Verification Summary (exit gate)

1. `xcodebuild … test` green (12/12) with `git diff --stat -- '*.png'` empty.
2. `grep -c "\.swift" AllyClock.xcodeproj/project.pbxproj` → 0 (no file enumeration survives).
3. Proof-of-contract spot check: create `AllyClock/Shared/Scratch.swift` containing `enum Scratch {}`, run the build (it must compile the new file with zero pbxproj edits), then delete the file and build again green. Nothing from this check is committed.
4. `apps/ios/CLAUDE.md` carries both the sync-group rule and the naming scheme; `AGENTS.md` symlink intact.
