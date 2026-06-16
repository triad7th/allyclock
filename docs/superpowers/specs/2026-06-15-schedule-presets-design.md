# Daily Schedule Presets — Design

Date: 2026-06-15
Status: Approved
App: `apps/web` (Angular 21)

## Summary

The Daily Schedule face currently holds a **single** schedule: segments in
localStorage (`allyclock.schedule`) and one image in IndexedDB. This redesign
turns it into **multiple named presets**, each with its own image and segments,
with one **active** preset driving the face. All editor controls become
SF-symbol overlay icons on the image. The standalone "Schedule Image" section,
the "+ Add segment boundary" button, and Export/Import are removed.

This work also introduces an **icon abstraction layer keyed to SF Symbol names**,
in service of the project goal that the Web app be a near-mechanical porting
reference for native iOS/watchOS/tvOS (see root `CLAUDE.md` "Platform Porting
Goal").

## Goals

- Manage several schedule presets (add / rename / delete / switch) in the config.
- Each preset owns its own image + time segments.
- One active preset drives the face.
- Replace big buttons/sections with SF-symbol overlay icons on the image.
- Introduce a reusable, SF-Symbol-named icon component.

## Non-Goals

- No Export/Import of segments (removed).
- No cross-preset sharing, cloud sync, or preset reordering.
- No change to the marker-drag / zone-time editing mechanics themselves.
- No change to the face's pan/scroll rendering math.

## Data Model

```ts
interface SchedulePreset {
  id: string;                 // stable, app-generated id
  name: string;               // "Summer Break", "Preset #2", …
  segments: ScheduleSegment[];
  hasImage: boolean;          // image bytes live in IndexedDB, keyed by id
}
```

`ScheduleSegment` is unchanged (`pixelStart`, `pixelEnd`, `timeStart`, `timeEnd`).

### Storage

- **localStorage** key `allyclock.schedule.presets`: JSON `{ presets: SchedulePreset[]; activePresetId: string }`.
- **IndexedDB** (`allyclock-schedule` DB, `assets` store): one image blob per
  preset, keyed by the preset `id` (replaces the single `image` key).

### Active preset

- `activePresetId` selects which preset the face renders and which preset the
  config editor targets. Selection is unified: tapping a preset card both edits
  and activates it.

## Persistence & Migration

On first load after this upgrade, `ScheduleStoreService` migrates legacy data:

1. If legacy `allyclock.schedule` segments and/or the legacy single IDB `image`
   key exist, create **one preset "Summer Break"** from them: segments from the
   old key (or `DEFAULT_SEGMENTS`), image re-keyed under the new preset id (or
   the bundled `allyclock-schedule.png` default when no stored image).
2. Set that preset active. Write the new `allyclock.schedule.presets` blob.
3. Remove the legacy `allyclock.schedule` localStorage key and the legacy IDB
   `image` key.

When nothing is stored at all (fresh install), seed the same default
"Summer Break" preset from `DEFAULT_SEGMENTS` + `DEFAULT_IMAGE_SRC`.

### Delete rule

- Deleting the active preset activates the nearest remaining preset.
- The **trash control is disabled when only one preset remains** — the user can
  never delete the last preset.
- Deleting a preset removes its IndexedDB image blob.

## UI & Interaction

All within `ScheduleConfigComponent`.

### Presets section (top)

- Horizontal scrolling row of **preset cards**: thumbnail (the preset's image;
  placeholder for an image-less preset) + **name only** (no subtitle).
- The active card is visually outlined.
- Trailing dashed **"+" add-preset card**.
- Tap a card → load it into the editor **and** make it active (commits immediately).
- Tap **+** → create a blank preset named `Preset #N`, activate it, show the
  empty editor (drop zone), seed one full-day segment `00:00 → 24:00`.

`Preset #N` numbering: N is chosen to avoid collisions with existing names
(e.g. one greater than the highest existing `Preset #k`, else `#2`, `#3`…).

### Editor section

- **Section title = the active preset's name** (replaces the static
  "Time Segments" heading).
- **Image stage** with a top-right overlay-icon cluster:
  - **Has image**: `pencil` (rename), `photo` (swap image), `plus`
    (add segment boundary), `trash` (delete preset).
  - **Empty preset (no image yet)**: `pencil` + `trash` only. The stage body is
    a **drop zone**: "Tap to upload or drag & drop a schedule image". Dropping or
    selecting an image stores it and reveals the full icon cluster.
- **Rename** (`pencil`) opens a small **inline popover** with a text field to
  edit the preset name.
- **Add segment** (`plus`) adds a boundary marker (existing `addMarker` logic).
- **Swap image** (`photo`) opens the file picker to replace the preset's image.
- **Delete** (`trash`) removes the preset (subject to the last-preset guard).
- Existing draggable boundary markers and per-zone time inputs are unchanged.

### Removed

- The standalone "Schedule Image" upload section.
- The "+ Add segment boundary" full-width button.
- The Export / Import buttons and the import-error UI.

### Commit model

The config is a **live settings manager**: every action (add, rename, delete,
image upload/swap, marker move, zone time edit) persists immediately to the
store. The gear button only opens/closes the panel — there is no staged
Save/Cancel. The face reflects the active preset when the panel closes (and the
existing close/slide-out animation is retained).

## Architecture & Components

### Icon abstraction layer (new)

- `IconComponent` (`app-icon`): `<app-icon name="pencil" />` where `name` is an
  **SF Symbol name** (`pencil`, `photo`, `plus`, `trash`, plus the upload glyph
  used in the drop zone). Renders an inline SVG from an internal name→path map.
- This is the porting seam: Apple ports swap the same names to
  `Image(systemName:)`.
- Lives under `apps/web/src/app/ui/icon/` (new shared `ui` folder).

### `ScheduleStoreService` (rework)

New preset-aware API, keeping the existing IndexedDB plumbing:

- `loadState(): { presets: SchedulePreset[]; activePresetId: string }` (runs
  migration/seed on first read).
- `addPreset(): SchedulePreset` (creates `Preset #N`, persists, returns it).
- `renamePreset(id, name)`.
- `deletePreset(id)` (guards last preset; removes image; reselects active).
- `setActive(id)`.
- `updateSegments(id, segments)`.
- Per-id image ops: `loadImage(id)`, `saveImage(id, blob)`, `removeImage(id)`.
- Legacy single-schedule methods are removed once migration covers them.

### `ScheduleConfigComponent` (rework)

- Renders the presets row + the per-preset editor.
- Targets the active preset; reuses the existing marker/zone signals and editing
  logic against that preset's segments.
- Drops the Save/Cancel staging (`pendingBlob`, `save()`, `cancel()`,
  export/import handlers) in favor of immediate-commit calls into the store.

### `ScheduleFaceComponent` (small change)

- Reads the **active preset** (segments + image) instead of the single schedule.
- On config close, refreshes from the active preset.

## Testing

- **Store specs**: preset CRUD; active selection; `Preset #N` numbering;
  migration from legacy `allyclock.schedule` + legacy IDB image; fresh-install
  seed; last-preset-delete guard; per-id image save/load/remove.
- **Config specs**: add preset shows empty drop zone + `pencil`/`trash` only;
  uploading an image reveals the full icon cluster; rename popover updates the
  section title and card; delete reselects active and is disabled at one preset;
  section title tracks the active preset name.
- **Face spec**: renders the active preset; switching active updates segments
  and image. Use fixed `Date` values for any time-dependent assertions.
- **Icon component spec**: known names render the expected SVG; unknown name is
  handled gracefully.
- Run `npm run build:web` before finishing.

## Open Questions

None. All decisions resolved during brainstorming.
