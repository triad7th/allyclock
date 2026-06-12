# AllyClock Web — Face-Based Single Page App Refactor

**Date:** 2026-06-11
**Status:** Approved
**Scope:** `apps/web` only. iOS is unchanged; this refactor becomes the reference design for a later iOS sync.

## Goal

Turn the web app into a single-page app with multiple selectable clock faces, matching the product model planned for iOS/web sync:

- Two initial faces: **Fullscreen** (a true port of the current iOS clock, showing browser-local time) and **World Cards** (the current web 3-card US/UK/KR layout).
- A **Configure** button at the bottom center opens a face picker; the chosen face persists across reloads.
- The architecture (face registry) is the shared mental model that the iOS app will mirror later (enum + protocol + switch).

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| What is a "face"? | Each face owns both its data model and its visual design. |
| Configure scope | Face selection only — no per-face settings. |
| Persistence | Selected face id persists across reloads via localStorage. |
| Fullscreen face data | Browser-local time and locale (true iOS port). |
| World Cards face data | Hardcoded US/UK/KR regions, ported as-is. |
| Configure button reveal | Video-player style: visible on load, auto-hides after ~4s; any pointer move/tap/keypress reveals and re-arms. |
| Picker UI | Bottom sheet sliding up from the Configure button, with live scaled-down face previews. |
| Architecture | Face registry + dynamic rendering (`NgComponentOutlet`). |
| Date/time library | Migrate `moment-timezone` → native `Intl.DateTimeFormat`; drop the moment dependency. |

## Structure

```
apps/web/src/app/
├── app.component.*              # Shell: renders active face + controls overlay
├── faces/
│   ├── face-registry.ts         # FaceDescriptor { id, displayName, component } + FACES list + DEFAULT_FACE_ID
│   ├── fullscreen/
│   │   ├── fullscreen-face.component.*   # iOS port: big time + info line
│   │   └── clock-formatter.ts            # Pure fns: bigTime / precise / dateTZ / gmtOffset (Intl-based)
│   └── world-cards/
│       ├── world-cards-face.component.*  # Current 3-card US/UK/KR layout
│       └── card/card.component.*         # Moved from app/card
├── controls/
│   ├── configure-button.component.*      # Bottom-center button
│   └── face-picker-sheet.component.*     # Bottom sheet with live face previews
└── services/
    ├── clock.service.ts          # Single shared `now` signal, ~30fps tick
    ├── face-preference.service.ts # localStorage persistence of selected face id
    └── location.service.ts        # Stays (world-cards), migrated moment → Intl
```

- The shell renders the active face via `NgComponentOutlet` driven by the registry.
- Adding a future face = one component + one registry entry. The picker and persistence pick it up automatically.
- `controls/` is UI chrome (overlay controls), named `controls` to avoid browser-name confusion.

## Components

### Face registry (`faces/face-registry.ts`)

```ts
interface FaceDescriptor {
  id: string;            // stable key, also the localStorage value
  displayName: string;   // shown in the picker
  component: Type<unknown>;
}
```

`FACES: FaceDescriptor[]` lists fullscreen first, then world-cards. `DEFAULT_FACE_ID = 'fullscreen'`.

### Fullscreen face

Direct port of iOS `ClockFormatter` semantics using `Intl.DateTimeFormat`:

- **Big time:** large digits, AM/PM marker beside them when the locale uses a 12-hour clock (matching iOS behavior); minutes zero-padded.
- **Info line:** monospace `HH:mm:ss.hundredths`, a `·` separator, then long-form date and `GMT±HH:MM` offset.
- Browser-local timezone and `navigator.language` locale.
- Sizing via CSS `clamp()`/viewport units instead of iOS's JS size buckets — same visual result, idiomatic for web.
- Dark background, light text, consistent with the iOS look.

### World Cards face

The existing `app.component.html` card layout and `card.component.*` move under `faces/world-cards/`, visually unchanged. Cards consume the shared `ClockService.now` signal instead of running their own `setInterval`.

### Controls

- **Configure button:** fixed at bottom center, layered above the active face. Visible on load; fades out after ~4s of inactivity. `pointermove`, `pointerdown`, or `keydown` anywhere reveals it and re-arms the hide timer. Never auto-hides while the sheet is open.
- **Face picker sheet:** slides up from the bottom. One option per registry entry, each a live preview (the real face component scaled down via CSS `transform: scale`) plus its display name; the active face is highlighted. Tap an option → switch + persist + close. Tap backdrop or press Escape → close. `role="dialog"`, focus moves into the sheet on open and returns to the button on close.

## Services

- **ClockService:** one `setInterval` at ~33ms (matches iOS's 30fps timeline) updating a `now` signal. All faces and previews share it. Replaces today's per-card 100ms intervals.
- **FacePreferenceService:** read/write `allyclock.face` in localStorage, exposed as a signal. Unknown or missing id → `DEFAULT_FACE_ID`. localStorage throwing (private browsing) → silent in-memory fallback.
- **LocationService:** keeps the US/UK/KR region → flag/timezone mapping; offset formatting reimplemented with `Intl.DateTimeFormat` (`timeZoneName: 'longOffset'` or equivalent) so `moment-timezone` can be removed from `package.json`.

## Error handling

- Stored face id not in registry → fall back to default face.
- localStorage unavailable → in-memory preference for the session; no user-facing error.
- `Intl` timezone formatting is supported in all evergreen browsers; no fallback layer needed.

## Testing (Vitest, fixed `Date` values per repo convention)

- `clock-formatter.spec.ts` — bigTime 12h/24h by locale, zero-padding, precise hundredths, dateTZ format, GMT offset signs, all with explicit timezones.
- `face-preference.service.spec.ts` — persists, restores, falls back on unknown id, survives localStorage throwing.
- `app.component.spec.ts` — default face renders; selecting a face in the sheet switches the rendered face and persists.
- `location.service.spec.ts` — updated for the Intl migration; same expected offsets.

## Out of scope

- Per-face settings (timezone selection, region editing).
- Faces beyond the initial two.
- Any iOS changes — the iOS sync is a separate later effort that uses this refactor as its reference.
- Routing/multi-page structure.
