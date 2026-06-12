# Daily Schedule Face — Design Spec

**Date:** 2026-06-11
**Status:** Approved
**Scope:** `apps/web` only — a new clock face added to the existing face registry. iOS port is out of scope.

## Overview

A new face called **Daily Schedule** that shows a user-supplied schedule image (a vertically stacked timetable/infographic) panned in real time so the current time is always vertically centered. The current schedule segment is highlighted with a thick red border overlay.

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| Config location | Inside the face — a gear icon that auto-hides like the main Configure button |
| Image storage | IndexedDB (`allyclock-schedule` store, key `image`, value `Blob`) |
| Segment mapping UX | Drag-marker editor — horizontal lines dragged on the image preview |
| Default when no image uploaded | Bundled placeholder PNG asset + matching default segments |
| Rendering approach | CSS `translateY` on `<img>`; no canvas |
| Segment mapping entry | Visual markers (not table, not plain text) |

## File Structure

```text
apps/web/src/app/faces/schedule/
├── schedule-face.component.ts/.html/.scss/.spec.ts
├── schedule-config/
│   └── schedule-config.component.ts/.html/.scss/.spec.ts
├── schedule-formatter.ts/.spec.ts
├── schedule-store.service.ts/.spec.ts
└── default-schedule.ts
```

Added to face registry:
- `apps/web/src/app/faces/face-registry.ts` — new entry for `schedule`

Asset:
- `apps/web/public/schedule-placeholder.png` — bundled placeholder schedule image

## Data Model

```ts
interface ScheduleSegment {
  pixelStart: number;  // top of segment in source image px
  pixelEnd: number;    // bottom of segment in source image px
  timeStart: string;   // "HH:MM" 24-hour
  timeEnd: string;     // "HH:MM" 24-hour
}
```

- **Segments** stored as `ScheduleSegment[]` JSON in `localStorage` under key `allyclock.schedule`.
- **Image blob** stored in IndexedDB database `allyclock-schedule`, object store `assets`, key `image`.

## Components

### ScheduleFaceComponent

The face shell. Fills its container (`width: 100%; height: 100%`) via `:host`. Renders:

1. `<img>` at `width: 100%; height: auto` — always fills viewport width; natural height proportional.
2. A `translateY` on a wrapper `div` shifts the image so `currentPixelY` lands at `viewportHeight / 2`.
3. An absolutely positioned `div.red-box` with a thick red border overlaid on the current segment.
4. A gear `<button>` fixed at bottom-right, auto-hides after 4s (same `pointermove` / `pointerdown` / `keydown` reveal pattern as `ConfigureButtonComponent`, implemented locally — not reusing that component since position and icon differ).

`currentPixelY` and `redBoxTop`/`redBoxHeight` are `computed()` signals reading from `ClockService.now`, segment config, and the natural image height.

```
translateY = -(currentPixelY - viewportHeight / 2)
```

The `translateY` updates every tick (no CSS transition — instant snap to keep it accurate).

### ScheduleConfigComponent

Full-face overlay (dark panel, `position: absolute; inset: 0; z-index: 5`). Opens when the gear button is tapped. Two sections:

**Image section**
- Drag-and-drop zone + `<input type="file" accept="image/*">`.
- On file selection: read as `Blob`, store in IndexedDB, render a thumbnail.
- "Remove image" link: clears IndexedDB entry, reverts to placeholder.

**Drag-marker segment editor**
- The image (uploaded or placeholder) renders at full width in a scrollable container (`max-height: 300px; overflow-y: auto`).
- Horizontal marker `div`s are absolutely positioned over the image (`cursor: ns-resize`). Dragging via `pointerdown` / `pointermove` / `pointerup` moves them.
- Between each adjacent pair of markers, a label zone shows two `<input type="time">` fields (`timeStart`, `timeEnd`).
- Marker pixel positions are stored in **source-image pixel space**: `sourceY = renderedY × (naturalHeight / renderedHeight)` on save.
- "Add marker" inserts a new marker at the rendered midpoint; tapping a marker's ✕ removes it (minimum 0 markers = 1 segment covering the full image).
- **Save**: converts rendered positions to source-image positions, writes `ScheduleSegment[]` to localStorage, closes overlay.
- **Cancel**: discards all in-progress drag state, closes overlay.

### ScheduleStoreService

`@Injectable({ providedIn: 'root' })`. Exposes:

- `loadImage(): Promise<string | null>` — opens IndexedDB, reads the blob, returns an object URL (or `null` if absent).
- `saveImage(blob: Blob): Promise<void>` — writes blob to IndexedDB.
- `removeImage(): Promise<void>` — deletes the IndexedDB entry.
- `loadSegments(): ScheduleSegment[]` — reads from localStorage; returns `DEFAULT_SEGMENTS` on missing/invalid JSON.
- `saveSegments(segments: ScheduleSegment[]): void` — writes to localStorage (swallows quota errors silently).

### schedule-formatter.ts (pure functions)

```ts
// Returns the interpolated Y position (in source-image pixels) for a given Date.
function currentPixelY(date: Date, segments: ScheduleSegment[]): number

// Returns the segment that contains the current time (clamped to first/last if outside all).
function activeSegment(date: Date, segments: ScheduleSegment[]): ScheduleSegment
```

`currentPixelY` algorithm:
1. Convert `date` to minutes from midnight using the browser's local timezone.
2. Find the matching segment. If before all segments, clamp to `segments[0].pixelStart`. If after all, clamp to `segments[last].pixelEnd`.
3. Within the segment: `progress = (nowMinutes - segStart) / (segEnd - segStart)` where times are in minutes.
4. Return `segment.pixelStart + progress × (segment.pixelEnd - segment.pixelStart)`.

### default-schedule.ts

Exports:
- `DEFAULT_IMAGE_PATH = '/schedule-placeholder.png'` — path to the bundled asset.
- `DEFAULT_SEGMENTS: ScheduleSegment[]` — a set of segments matching the placeholder image's visual layout.

## Face Registry

Add to `FACES` in `face-registry.ts`:
```ts
{ id: 'schedule', displayName: 'Daily Schedule', component: ScheduleFaceComponent }
```

`DEFAULT_FACE_ID` remains `'fullscreen'`.

## Error Handling

| Scenario | Behavior |
| --- | --- |
| No image in IndexedDB | Use `DEFAULT_IMAGE_PATH` |
| Image fails to load | Fall back to `DEFAULT_IMAGE_PATH` |
| IndexedDB unavailable | Silently fall back to placeholder; segments still work via localStorage |
| localStorage unavailable | Use `DEFAULT_SEGMENTS`; no persistence |
| Current time before first segment | Clamp to `segments[0].pixelStart` |
| Current time after last segment | Clamp to `segments[last].pixelEnd` |
| Empty segments array | Treat as single full-image segment (show image centered at midpoint) |

## Testing

- **`schedule-formatter.spec.ts`** — fixed `Date` values, explicit segment arrays:
  - Interpolation at segment start, midpoint, end
  - Clamping before first / after last segment
  - Single-segment edge case
  - Multi-segment boundary (time exactly at a boundary)
- **`schedule-store.service.spec.ts`** — mock IndexedDB and localStorage; test load/save/remove paths and fallbacks
- **`schedule-face.component.spec.ts`** — component creates, renders an `img`, renders `.red-box`; gear button visible on load, hides after 4s
- **`schedule-config.component.spec.ts`** — Save writes segments; Cancel discards; Add/remove markers updates the list

## Out of Scope

- Smooth CSS transition between positions (instant update only)
- Segment labels / names ("Sleep", "Work" — time ranges only)
- Multiple named schedule configs
- Timezone selection (always browser-local time, like the fullscreen face)
- iOS port (separate future effort)
