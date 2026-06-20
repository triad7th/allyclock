# AllyClock Web Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `apps/web/src/app` into idiomatic `core/ · shared/ui/ · features/ · layout/` tiers with tsconfig path aliases, one-way dependencies, an `AutoHideDirective`, and single-source animation timing — preserving all behavior.

**Architecture:** Alias-first, incremental. Add `@core/@shared/@features/@layout` path aliases, then move one tier per task with `git mv` (preserves blame), rewriting cross-tier imports to aliases. Two behavior-preserving cleanups follow the moves: a shared auto-hide directive and CSS-variable-driven timing. The build + full test suite is the gate between every step.

**Tech Stack:** Angular 21 standalone + signals (zoneless), Vitest (`@angular/build:unit-test`), SCSS with `@use 'tokens'`, esbuild bundler (`moduleResolution: bundler`).

**Conventions for every task:**
- Run all commands from the repo root `/Volumes/AllyDrive/Storage/Repos/allyclock`.
- Gate: `npm run build:web` AND `npm run test:web` must both be green before committing each task. There is no alias-boundary lint, so the build is what catches a missed import fixup.
- Moves use `git mv` (never delete+recreate) to preserve history/blame.
- **Import-rewrite rule:** when a module moves, rewrite *cross-tier* imports of it to its new `@tier/...` alias. Imports *within* a subtree that moves together (e.g. `fullscreen-face` → `./clock-formatter`) stay relative. Find importers with `grep -rn "<old-relative-or-symbol>" apps/web/src`. The build lists any miss.
- Two-space indent, single quotes, final newline.
- Every commit message ends with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- Spec: `docs/superpowers/specs/2026-06-19-web-architecture-refactor-design.md`.

---

## File moves (reference map)

| Current | New | Alias for importers |
|---------|-----|---------------------|
| `config/animation-timing.ts` | `core/animation-timing.ts` | `@core/animation-timing` |
| `services/clock.service.ts(+spec)` | `core/clock.service.ts(+spec)` | `@core/clock.service` |
| `services/face-config.service.ts` | `core/face-config.service.ts` | `@core/face-config.service` |
| `services/face-preference.service.ts(+spec)` | `core/face-preference.service.ts(+spec)` | `@core/face-preference.service` |
| `services/location.service.ts(+spec)` | `core/location.service.ts(+spec)` | `@core/location.service` |
| `faces/dimension-band.ts` | `core/dimensions/dimension-band.ts` | `@core/dimensions/dimension-band` |
| `services/dimension-registry.service.ts(+spec)` | `core/dimensions/dimension-registry.service.ts(+spec)` | `@core/dimensions/dimension-registry.service` |
| `faces/band-config-store.ts(+spec)` | `core/dimensions/band-config-store.ts(+spec)` | `@core/dimensions/band-config-store` |
| `ui/<icon,icon-button,sheet,nav-header,container-size>/` | `shared/ui/<same>/` | `@shared/ui/<…>` |
| `ui/tokens.scss` | `shared/ui/tokens.scss` | (resolved via `includePaths`) |
| `src/_range-slider.scss` | `shared/ui/_range-slider.scss` | (from `styles.scss`) |
| `faces/face-registry.ts` | `features/faces/face-registry.ts` | `@features/faces/face-registry` |
| `faces/<fullscreen,schedule,world-cards>/` | `features/faces/<same>/` | `@features/faces/<…>` |
| `app.component.{ts,html,scss,spec}` | `layout/app.component.{…}` | `@layout/app.component` |
| `controls/<configure-button,adjust-button,face-picker-sheet,time-machine,face-overlay>/` | `layout/<same>/` | `@layout/<…>` |

---

## Task 1: Path aliases + resolution proof (move `animation-timing`)

**Files:**
- Modify: `apps/web/tsconfig.json`
- Move: `apps/web/src/app/config/animation-timing.ts` → `apps/web/src/app/core/animation-timing.ts`
- Modify: every importer of `config/animation-timing`

- [ ] **Step 1: Add `baseUrl` + `paths` to the base tsconfig**

In `apps/web/tsconfig.json`, add a `paths` block to `compilerOptions` (after the `"importHelpers": true,` line). **Do not add `baseUrl`** (deprecated, removed in TS 7.0); use `./`-prefixed path targets so they resolve relative to the tsconfig directory without it:

```jsonc
    "importHelpers": true,
    "paths": {
      "@core/*": ["./src/app/core/*"],
      "@shared/*": ["./src/app/shared/*"],
      "@features/*": ["./src/app/features/*"],
      "@layout/*": ["./src/app/layout/*"]
    },
    "target": "ES2022",
```

(`tsconfig.app.json` and `tsconfig.spec.json` both `extends` this base, so the aliases are inherited by build and Vitest.)

- [ ] **Step 2: Move `animation-timing.ts` into `core/`**

```bash
mkdir -p apps/web/src/app/core
git mv apps/web/src/app/config/animation-timing.ts apps/web/src/app/core/animation-timing.ts
rmdir apps/web/src/app/config
```

- [ ] **Step 3: Rewrite every importer to the alias**

Find them:

```bash
grep -rn "config/animation-timing" apps/web/src
```

Replace each relative import (e.g. `'../../config/animation-timing'`, `'./config/animation-timing'`) with `'@core/animation-timing'`. Known importers: `controls/face-overlay`, `controls/time-machine`, `controls/adjust-button` (and `configure-button` after Task 6), `faces/fullscreen/fullscreen-face.component.ts`, `ui/sheet/sheet.component.ts`, `app.component.ts`, plus their specs that import `SHEET_ANIMATION_MS`/`AUTO_HIDE_MS`/`FACE_TRANSITION_MS`. Use the grep output as the authoritative list.

- [ ] **Step 4: Verify build + tests resolve the alias**

Run: `npm run build:web`
Expected: success (proves the esbuild bundler resolves `@core/*`).

Run: `npm run test:web`
Expected: full suite green (proves Vitest resolves `@core/*`). If Vitest fails to resolve the alias, STOP — the path aliases are not wired for the test runner and must be fixed before any further move.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(printf 'refactor(web): add tsconfig path aliases; move animation-timing to core/\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 2: `core/` — singletons + the `dimensions/` cluster

**Files:**
- Move: the five service files + the three dimension files (see commands).
- Modify: every importer of the moved modules.

This task eliminates the headline smell: `dimension-registry` (a core singleton) currently imports **up** into `faces/`. After the move, `dimension-registry`, `dimension-band`, and `band-config-store` are siblings in `core/dimensions/`, so that import becomes a clean relative sibling import.

- [ ] **Step 1: Move the core singletons**

```bash
git mv apps/web/src/app/services/clock.service.ts apps/web/src/app/core/clock.service.ts
git mv apps/web/src/app/services/clock.service.spec.ts apps/web/src/app/core/clock.service.spec.ts
git mv apps/web/src/app/services/face-config.service.ts apps/web/src/app/core/face-config.service.ts
git mv apps/web/src/app/services/face-preference.service.ts apps/web/src/app/core/face-preference.service.ts
git mv apps/web/src/app/services/face-preference.service.spec.ts apps/web/src/app/core/face-preference.service.spec.ts
git mv apps/web/src/app/services/location.service.ts apps/web/src/app/core/location.service.ts
git mv apps/web/src/app/services/location.service.spec.ts apps/web/src/app/core/location.service.spec.ts
```

- [ ] **Step 2: Move the dimensions cluster into `core/dimensions/`**

```bash
mkdir -p apps/web/src/app/core/dimensions
git mv apps/web/src/app/services/dimension-registry.service.ts apps/web/src/app/core/dimensions/dimension-registry.service.ts
git mv apps/web/src/app/services/dimension-registry.service.spec.ts apps/web/src/app/core/dimensions/dimension-registry.service.spec.ts
git mv apps/web/src/app/faces/dimension-band.ts apps/web/src/app/core/dimensions/dimension-band.ts
git mv apps/web/src/app/faces/band-config-store.ts apps/web/src/app/core/dimensions/band-config-store.ts
git mv apps/web/src/app/faces/band-config-store.spec.ts apps/web/src/app/core/dimensions/band-config-store.spec.ts
rmdir apps/web/src/app/services
```

- [ ] **Step 3: Fix the (now-sibling) import inside `dimension-registry.service.ts`**

It imports `dimension-band`. Since both are now in `core/dimensions/`, make it a sibling import:

```ts
import { /* … */ } from './dimension-band';
```

(Previously this reached `../faces/dimension-band` — the backwards import is gone.)

- [ ] **Step 4: Rewrite all external importers to aliases**

Find them and rewrite:

```bash
grep -rn "services/clock.service\|services/face-config\|services/face-preference\|services/location\|services/dimension-registry\|faces/dimension-band\|faces/band-config-store" apps/web/src
```

Rewrite to: `@core/clock.service`, `@core/face-config.service`, `@core/face-preference.service`, `@core/location.service`, `@core/dimensions/dimension-registry.service`, `@core/dimensions/dimension-band`, `@core/dimensions/band-config-store`. Importers span `app.component.ts`, the controls (`face-overlay`, `time-machine`, `configure-button`, `face-picker-sheet`), and the faces (`fullscreen-config-store.service.ts`, `fullscreen-face`, `fullscreen-config`, `fullscreen-presets.data`, `schedule-*`, `world-cards-face`, `card`). The grep output is authoritative.

- [ ] **Step 5: Verify**

Run: `npm run build:web` → success.
Run: `npm run test:web` → green. (The spec files moved with their code; `dimension-registry.service.spec.ts` and `band-config-store.spec.ts` use only relative-to-themselves or alias imports.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(printf 'refactor(web): move singletons + dimensions cluster into core/ (kills backwards import)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 3: `shared/ui/` — primitives + tokens + range-slider

**Files:**
- Move: `ui/*` → `shared/ui/*`; `src/_range-slider.scss` → `shared/ui/_range-slider.scss`.
- Modify: `apps/web/angular.json` (`includePaths`), `apps/web/src/styles.scss`, every importer of `ui/*`.

- [ ] **Step 1: Move the UI primitives + styles**

```bash
mkdir -p apps/web/src/app/shared/ui
git mv apps/web/src/app/ui/icon apps/web/src/app/shared/ui/icon
git mv apps/web/src/app/ui/icon-button apps/web/src/app/shared/ui/icon-button
git mv apps/web/src/app/ui/sheet apps/web/src/app/shared/ui/sheet
git mv apps/web/src/app/ui/nav-header apps/web/src/app/shared/ui/nav-header
git mv apps/web/src/app/ui/container-size apps/web/src/app/shared/ui/container-size
git mv apps/web/src/app/ui/tokens.scss apps/web/src/app/shared/ui/tokens.scss
git mv apps/web/src/_range-slider.scss apps/web/src/app/shared/ui/_range-slider.scss
rmdir apps/web/src/app/ui
```

- [ ] **Step 2: Update the SCSS `includePaths` (same commit as the tokens move)**

In `apps/web/angular.json`, change the `stylePreprocessorOptions.includePaths` value from `"src/app/ui"` to `"src/app/shared/ui"`:

```json
            "stylePreprocessorOptions": {
              "includePaths": [
                "src/app/shared/ui"
              ]
            },
```

This keeps the bare `@use 'tokens'` resolving for its ~11 importers.

- [ ] **Step 3: Update `styles.scss`'s range-slider import**

In `apps/web/src/styles.scss`, change line 2 from `@use './range-slider';` to:

```scss
@use './app/shared/ui/range-slider';
```

- [ ] **Step 4: Rewrite all TS importers of `ui/*` to `@shared/ui/*`**

```bash
grep -rn "ui/icon\|ui/sheet\|ui/nav-header\|ui/icon-button\|ui/container-size" apps/web/src --include=*.ts
```

Rewrite e.g. `'../../ui/icon/icon.component'` → `'@shared/ui/icon/icon.component'`, `'../../../ui/sheet/sheet.component'` → `'@shared/ui/sheet/sheet.component'`, etc. (`container-size.directive`, `nav-header.component`, `icon-button.component` likewise.)

- [ ] **Step 5: Verify**

Run: `npm run build:web` → success (confirms `@use 'tokens'` still resolves AND `styles.scss` finds the moved partial).
Run: `npm run test:web` → green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(printf 'refactor(web): move UI primitives + tokens + range-slider into shared/ui/\n\nUpdates angular.json includePaths and styles.scss in lockstep.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 4: `features/faces/`

**Files:**
- Move: `faces/face-registry.ts` + the three face dirs → `features/faces/`.
- Modify: importers of `faces/*`.

- [ ] **Step 1: Move the faces subtree**

```bash
mkdir -p apps/web/src/app/features/faces
git mv apps/web/src/app/faces/face-registry.ts apps/web/src/app/features/faces/face-registry.ts
git mv apps/web/src/app/faces/fullscreen apps/web/src/app/features/faces/fullscreen
git mv apps/web/src/app/faces/schedule apps/web/src/app/features/faces/schedule
git mv apps/web/src/app/faces/world-cards apps/web/src/app/features/faces/world-cards
rmdir apps/web/src/app/faces
```

(Intra-face relative imports — e.g. `fullscreen-face` → `./clock-formatter`, `./fullscreen-style`, `./fullscreen-config/…` — are unchanged; the whole subtree moved together. The `@core/*` and `@shared/ui/*` aliases written in Tasks 2–3 are already correct and need no change.)

- [ ] **Step 2: Rewrite external importers of faces to `@features/faces/*`**

```bash
grep -rn "faces/face-registry\|faces/fullscreen\|faces/schedule\|faces/world-cards" apps/web/src --include=*.ts
```

The main importer is `app.component.ts` (imports `FACES`/`FaceDescriptor`/`DEFAULT_FACE_ID` from `face-registry`, and `face-registry.ts` imports the three face components + `FullscreenConfigComponent`). Rewrite `'./faces/face-registry'` → `'@features/faces/face-registry'`. Inside `face-registry.ts`, its imports of the face components stay relative (`./fullscreen/fullscreen-face.component`, etc.) since they moved with it.

- [ ] **Step 3: Verify**

Run: `npm run build:web` → success.
Run: `npm run test:web` → green.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "$(printf 'refactor(web): move faces under features/faces/\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 5: `layout/` — app shell + chrome

**Files:**
- Move: `app.component.*` + `controls/*` → `layout/`.
- Modify: `apps/web/src/main.ts` (the `AppComponent` import), importers of `controls/*`.

- [ ] **Step 1: Move app.component + the controls into `layout/`**

```bash
mkdir -p apps/web/src/app/layout
git mv apps/web/src/app/app.component.ts apps/web/src/app/layout/app.component.ts
git mv apps/web/src/app/app.component.html apps/web/src/app/layout/app.component.html
git mv apps/web/src/app/app.component.scss apps/web/src/app/layout/app.component.scss
git mv apps/web/src/app/app.component.spec.ts apps/web/src/app/layout/app.component.spec.ts
git mv apps/web/src/app/controls/configure-button apps/web/src/app/layout/configure-button
git mv apps/web/src/app/controls/adjust-button apps/web/src/app/layout/adjust-button
git mv apps/web/src/app/controls/face-picker-sheet apps/web/src/app/layout/face-picker-sheet
git mv apps/web/src/app/controls/time-machine apps/web/src/app/layout/time-machine
git mv apps/web/src/app/controls/face-overlay apps/web/src/app/layout/face-overlay
rmdir apps/web/src/app/controls
```

- [ ] **Step 2: Update `main.ts`'s `AppComponent` import**

In `apps/web/src/main.ts`, change line 3:

```ts
import { AppComponent } from '@layout/app.component';
```

(Its `appConfig` import from `'./app/app.config'` is unchanged — `app.config.ts` does not move.)

- [ ] **Step 3: Fix `app.component.ts`'s imports of the controls**

`app.component.ts` imports `ConfigureButtonComponent`, `AdjustButtonComponent`, `FacePickerSheetComponent`, `TimeMachineComponent`, `FaceOverlayComponent` (formerly `./controls/…`). They are now siblings under `layout/`, so make them relative siblings:

```ts
import { ConfigureButtonComponent } from './configure-button/configure-button.component';
import { AdjustButtonComponent } from './adjust-button/adjust-button.component';
import { FacePickerSheetComponent } from './face-picker-sheet/face-picker-sheet.component';
import { TimeMachineComponent } from './time-machine/time-machine.component';
import { FaceOverlayComponent } from './face-overlay/face-overlay.component';
```

Its other imports (`@features/faces/face-registry`, `@core/face-preference.service`, `@core/face-config.service`, `@core/animation-timing`) are already aliased and correct.

- [ ] **Step 4: Rewrite any remaining `controls/*` importers**

```bash
grep -rn "controls/" apps/web/src --include=*.ts
```

Expected: none outside `layout/` after Step 3 (the controls were only used by `app.component`). Fix any stragglers to relative `./` (within layout) or `@layout/*` (from elsewhere).

- [ ] **Step 5: Verify**

Run: `npm run build:web` → success.
Run: `npm run test:web` → green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(printf 'refactor(web): move app shell + controls into layout/\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 6: `AutoHideDirective` + migrate the auto-hide sites

**Files:**
- Create: `apps/web/src/app/shared/ui/auto-hide.directive.ts` + `.spec.ts`
- Modify: `layout/configure-button`, `layout/adjust-button`, `layout/time-machine`, `layout/face-overlay` (+ optionally `features/faces/fullscreen/fullscreen-face`, `features/faces/schedule/schedule-face`).

The directive owns ONLY the idle timer + `reveal()` + `visible` signal. Each host keeps its own `hidden` binding ORing `ah.visible()` with its force-visible terms (see the spec's wiring table).

- [ ] **Step 1: Write the failing directive spec**

`apps/web/src/app/shared/ui/auto-hide.directive.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutoHideDirective } from './auto-hide.directive';
import { AUTO_HIDE_MS } from '@core/animation-timing';

@Component({
  selector: 'test-host',
  imports: [AutoHideDirective],
  template: `<div appAutoHide #ah="autoHide" [revealBlocked]="blocked" [holdVisible]="hold"></div>`,
})
class HostComponent {
  blocked = false;
  hold = false;
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const dir = fixture.debugElement.children[0].injector.get(AutoHideDirective);
  return { fixture, dir };
}

describe('AutoHideDirective', () => {
  it('starts visible and auto-hides after AUTO_HIDE_MS', () => {
    vi.useFakeTimers();
    try {
      const { dir } = setup();
      expect(dir.visible()).toBe(true);
      vi.advanceTimersByTime(AUTO_HIDE_MS);
      expect(dir.visible()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reveal() restores visibility and re-arms the timer', () => {
    vi.useFakeTimers();
    try {
      const { dir } = setup();
      vi.advanceTimersByTime(AUTO_HIDE_MS);
      expect(dir.visible()).toBe(false);
      dir.reveal();
      expect(dir.visible()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reveal() is a no-op while revealBlocked is true', () => {
    vi.useFakeTimers();
    try {
      const { fixture, dir } = setup();
      vi.advanceTimersByTime(AUTO_HIDE_MS);
      fixture.componentInstance.blocked = true;
      fixture.detectChanges();
      dir.reveal();
      expect(dir.visible()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('holdVisible suppresses the auto-hide timer', () => {
    vi.useFakeTimers();
    try {
      const { fixture, dir } = setup();
      fixture.componentInstance.hold = true;
      fixture.detectChanges();
      dir.reveal();
      vi.advanceTimersByTime(AUTO_HIDE_MS * 2);
      expect(dir.visible()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:web`
Expected: FAIL — `Cannot find module './auto-hide.directive'`.

- [ ] **Step 3: Implement the directive**

`apps/web/src/app/shared/ui/auto-hide.directive.ts`:

```ts
import { Directive, OnDestroy, Signal, computed, effect, input, signal } from '@angular/core';
import { AUTO_HIDE_MS } from '@core/animation-timing';

/**
 * Shared auto-hide-on-idle. Owns the idle `visible` signal, the document
 * pointer/key listeners, and the AUTO_HIDE_MS timer. The host computes FINAL
 * visibility itself (ORing `visible()` with any force-visible terms).
 *   - revealBlocked: reveal() is a no-op while true (e.g. a config panel open).
 *   - holdVisible: the auto-hide timer is suppressed while true (e.g. own sheet open).
 */
@Directive({
  selector: '[appAutoHide]',
  exportAs: 'autoHide',
  host: {
    '(document:pointermove)': 'reveal()',
    '(document:pointerdown)': 'reveal()',
    '(document:keydown)': 'reveal()',
  },
})
export class AutoHideDirective implements OnDestroy {
  readonly revealBlocked = input(false);
  readonly holdVisible = input(false);

  private readonly _visible = signal(true);
  readonly visible: Signal<boolean> = this._visible.asReadonly();

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.armTimer();
    // When holdVisible flips on, cancel any pending hide; when it flips off, re-arm.
    effect(() => {
      if (this.holdVisible()) {
        clearTimeout(this.timer);
      } else {
        this.armTimer();
      }
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }

  reveal(): void {
    if (this.revealBlocked()) return;
    this._visible.set(true);
    this.armTimer();
  }

  private armTimer(): void {
    clearTimeout(this.timer);
    if (this.holdVisible()) return;
    this.timer = setTimeout(() => this._visible.set(false), AUTO_HIDE_MS);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:web`
Expected: the four `AutoHideDirective` cases PASS; rest of the suite still green.

- [ ] **Step 5: Migrate the four controls**

For each control, remove its local `visible` signal, `hideTimer`, `armHideTimer`, `reveal`, the `host` document listeners, and (where present) the local `HIDE_DELAY_MS`. Add `AutoHideDirective` to `imports`, put `appAutoHide #ah="autoHide"` on the host element in the template, wire the inputs, and bind `[class.hidden]` per the table. Keep all other component members (e.g. `configure-button`'s `button` viewChild + `focusButton()` + `pinned` input).

Exact per-site wiring (from the spec):

| Component | directive inputs | host `[class.hidden]` binding |
|-----------|------------------|-------------------------------|
| `adjust-button` | (none) | `!ah.visible()` |
| `configure-button` | (none) | `!ah.visible() && !pinned()` |
| `time-machine` | `[holdVisible]="panelOpen()"` | `!ah.visible() && !panelOpen() && !isMocked()` |
| `face-overlay` | `[revealBlocked]="faceConfig.open()"` | `!ah.visible() || faceConfig.open() || sheetOpen()` |

**Apply the directive to a template element and read it via the `#ah` ref — not `hostDirectives`** (host-directive inputs can't be bound to a dynamic host expression like `faceConfig.open()`). The document listeners fire globally regardless of which element carries the directive, and a template ref is visible to sibling elements in the same template.

- **configure-button / adjust-button / time-machine:** put `appAutoHide #ah="autoHide"` (+ inputs from the table) on the single root element of the template (the `<button>` / control wrapper) and bind `[class.hidden]` on it.
- **face-overlay:** it has two sibling `<p>` roots (`.label`, `.chip`) and no wrapper. Put `appAutoHide #ah="autoHide" [revealBlocked]="faceConfig.open()"` on the `.label` `<p>`; both `<p>`s bind `[class.hidden]="!ah.visible() || faceConfig.open() || sheetOpen()"` (the `#ah` ref on `.label` is referenceable from `.chip`). Delete the `.ts` `hidden`/`visible`/`reveal`/timer and the host document listeners; KEEP the `hostDirectives: [ContainerSizeDirective]`, the `band`/`isMocked`/`sheetOpen`/`faceConfig` members. The existing `face-overlay.component.spec.ts` (asserts label text, LIVE/MOCK, hidden-while-config-open, hidden-while-sheetOpen, auto-hide) must still pass — update only the mechanism, not the asserted behavior.

- [ ] **Step 6: (Optional) migrate the two face gears**

`fullscreen-face`: `[revealBlocked]="faceConfig.open()"`, gear binds `!ah.visible()`. `schedule-face`: `[revealBlocked]="configOpen()"`, gear binds `!ah.visible() || configOpen()`, and delete its local `HIDE_DELAY_MS = 4000`. Skip a gear if its migration isn't clean; leave it on its local timer.

- [ ] **Step 7: Verify**

Run: `npm run build:web` → success.
Run: `npm run test:web` → green (the existing control/face specs assert the same visible/hidden behavior and must still pass).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "$(printf 'refactor(web): extract AutoHideDirective; dedupe the auto-hide sites\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 7: Single-source the animation timing

**Files:**
- Modify: `apps/web/src/app/core/animation-timing.ts` (comments), `apps/web/src/app/app.config.ts` (set CSS vars), `apps/web/src/app/shared/ui/tokens.scss` (remove literals), `apps/web/src/app/shared/ui/sheet/sheet.component.scss`, `apps/web/src/app/layout/app.component.scss`.
- Create: a guard test.

- [ ] **Step 1: Export a var-setter from `animation-timing.ts`, call it at bootstrap**

In `apps/web/src/app/core/animation-timing.ts`, add an exported function (keeps the timing the single source AND makes the behavior unit-testable without bootstrapping):

```ts
// Mirror the timing constants into CSS custom properties so SCSS derives from
// the same source of truth. Called once at app startup.
export function applyAnimationTimingVars(root: HTMLElement = document.documentElement): void {
  root.style.setProperty('--sheet-anim', `${SHEET_ANIMATION_MS}ms`);
  root.style.setProperty('--face-anim', `${FACE_TRANSITION_MS}ms`);
}
```

In `apps/web/src/app/app.config.ts`, register it as an app initializer (add to the existing `providers` array):

```ts
import { provideAppInitializer } from '@angular/core';
import { applyAnimationTimingVars } from '@core/animation-timing';

// inside appConfig.providers:
provideAppInitializer(() => applyAnimationTimingVars()),
```

- [ ] **Step 2: Swap SCSS usages to CSS vars**

In `apps/web/src/app/shared/ui/sheet/sheet.component.scss`, replace every `t.$sheet-anim` with `var(--sheet-anim, 0.28s)` (4 occurrences — the entrance/exit `animation:` declarations). In `apps/web/src/app/layout/app.component.scss`, replace every `t.$face-anim` with `var(--face-anim, 0.3s)` (2 occurrences, lines 11 and 16). Confirm with:

```bash
grep -rn "\$sheet-anim\|\$face-anim" apps/web/src
```

Expected after edits: only the definitions in `tokens.scss` remain (removed next step).

- [ ] **Step 3: Remove the SCSS literals + stale comments**

In `apps/web/src/app/shared/ui/tokens.scss`, delete the `$sheet-anim` and `$face-anim` definitions and their "MUST equal …" comments (the block around lines 36–43). In `apps/web/src/app/core/animation-timing.ts`, update the two "MUST equal … in src/app/ui/tokens.scss" comments to note the values are pushed to the `--sheet-anim` / `--face-anim` CSS vars at bootstrap (single source of truth).

- [ ] **Step 4: Add the guard test**

`apps/web/src/app/core/animation-timing.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  applyAnimationTimingVars,
  SHEET_ANIMATION_MS,
  FACE_TRANSITION_MS,
} from './animation-timing';

describe('applyAnimationTimingVars', () => {
  it('writes --sheet-anim / --face-anim from the TS constants', () => {
    const el = document.createElement('div');
    applyAnimationTimingVars(el);
    expect(el.style.getPropertyValue('--sheet-anim')).toBe(`${SHEET_ANIMATION_MS}ms`);
    expect(el.style.getPropertyValue('--face-anim')).toBe(`${FACE_TRANSITION_MS}ms`);
  });
});
```

- [ ] **Step 5: Verify**

Run: `npm run test:web` → green (incl. the new guard test).
Run: `npm run build:web` → success. Manually confirm a sheet still slides over ~280ms and a face crossfade is ~300ms (durations unchanged).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(printf 'refactor(web): single-source animation timing via CSS vars from TS constants\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 8: Housekeeping + docs

**Files:**
- Move: `features/faces/schedule/schedule-config/schedule-marker.component.*` → its own dir.
- Modify: `apps/web/CLAUDE.md`, root `CLAUDE.md`; optional `shared/ui/icon/icon.component.ts`, CI doc.

- [ ] **Step 1: Extract `schedule-marker` into its own directory**

```bash
mkdir -p apps/web/src/app/features/faces/schedule/schedule-marker
git mv apps/web/src/app/features/faces/schedule/schedule-config/schedule-marker.component.ts apps/web/src/app/features/faces/schedule/schedule-marker/schedule-marker.component.ts
git mv apps/web/src/app/features/faces/schedule/schedule-config/schedule-marker.component.html apps/web/src/app/features/faces/schedule/schedule-marker/schedule-marker.component.html
git mv apps/web/src/app/features/faces/schedule/schedule-config/schedule-marker.component.scss apps/web/src/app/features/faces/schedule/schedule-marker/schedule-marker.component.scss
```

Update the import of `ScheduleMarkerComponent` inside `schedule-config.component.ts` from `./schedule-marker.component` to `../schedule-marker/schedule-marker.component`.

- [ ] **Step 2: Update `apps/web/CLAUDE.md`**

In the "Important Files" / "Conventions" sections, document: the new `core/ · shared/ui/ · features/ · layout/` structure and one-way deps; that **type suffixes are kept** (`.component`/`.service`/`.directive`); the path aliases `@core/@shared/@features/@layout` (no app-internal barrels). Update any stale path references (e.g. `src/app/faces/face-registry.ts` → `src/app/features/faces/face-registry.ts`; `services/`/`controls/`/`ui/` mentions).

- [ ] **Step 3: Update the root `CLAUDE.md` "Important Files" paths**

Fix the moved paths it lists: `apps/web/src/app/faces/face-registry.ts` → `apps/web/src/app/features/faces/face-registry.ts`; `apps/web/src/app/faces/` → `apps/web/src/app/features/faces/`; `apps/web/src/app/controls/` → `apps/web/src/app/layout/`; `apps/web/src/app/services/location.service.ts` → `apps/web/src/app/core/location.service.ts`.

- [ ] **Step 4: (Optional) Type the icon `name` as an SF-Symbol union**

In `apps/web/src/app/shared/ui/icon/icon.component.ts`, add `export type SfSymbol = keyof typeof ICON_PATHS;` and change the `name` input type from `string` to `SfSymbol`. Run `npm run build:web` — if any caller passes a name not in `ICON_PATHS`, the build flags it; add the missing path or fix the caller. Skip this step if undesired.

- [ ] **Step 5: (Optional) Fix the CI Node-version doc drift**

If `.github/workflows/allyclock.yml` uses Node 24.x while `CLAUDE.md` says 20.x, reconcile the docs to match the workflow (or vice-versa per the user's intent). Documentation-only.

- [ ] **Step 6: Verify**

Run: `npm run build:web` → success.
Run: `npm run test:web` → green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(printf 'chore(web): extract schedule-marker dir; document new architecture\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Final verification

- [ ] **Step 1:** `npm run test:web` — full suite green (incl. the new `AutoHideDirective` + timing guard specs).
- [ ] **Step 2:** `npm run build:web` — clean, no component-style budget errors.
- [ ] **Step 3:** Confirm the tree matches the spec's target: `find apps/web/src/app -maxdepth 2 -type d | sort` shows `core/ core/dimensions/ shared/ui/ features/faces/ layout/` and no `services/ controls/ ui/ config/ faces/` at `app/` root.
- [ ] **Step 4:** Manual smoke across a wide (840×400) and portrait ratio: faces render, controls + overlays auto-hide and reveal on pointer move, sheets animate (~280ms), face crossfade (~300ms), LIVE/MOCK chip + dimension label intact.
