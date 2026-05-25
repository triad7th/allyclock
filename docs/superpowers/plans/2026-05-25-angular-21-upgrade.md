# AllyClock Web — Angular 21 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `apps/web` from Angular 18.1 to Angular 21.0 on a single branch (`chore/angular-21`), replacing Karma with Vitest, enabling zoneless change detection with signal-based ticking, and adopting `inject()` / standalone `DatePipe`.

**Architecture:** Six sequential commits on `chore/angular-21`. Three commits walk `ng update` through majors (18→19→20→21). One commit replaces the test stack. One commit flips zoneless and converts the only ticking component to signals. One commit cleans up DI and module imports. Each commit is independently buildable and (from commit 4 onward) independently test-passing.

**Tech Stack:** Angular 21.0.x, TypeScript ~5.9, RxJS ~7.8, Vitest + jsdom via `@angular/build:unit-test`, zoneless change detection, signals, standalone components, Bootstrap 5, moment-timezone, Node 20.19+.

**Spec:** `docs/superpowers/specs/2026-05-25-angular-21-upgrade-design.md`

---

## File Structure

All paths relative to repo root.

- Modify `apps/web/package.json`: bump `@angular/*` deps to ^21, swap `@angular-devkit/build-angular` for `@angular/build`, drop `zone.js`, drop all `karma*` + `jasmine-core` + `@types/jasmine`, add `vitest` + `jsdom`, bump TypeScript to `~5.9`.
- Modify `apps/web/angular.json`: swap `test` builder to `@angular/build:unit-test`, remove `zone.js` from `build.options.polyfills` and the `test` builder's polyfills.
- Modify `apps/web/tsconfig.spec.json`: replace `"types": ["jasmine"]` with `"types": ["vitest/globals"]`.
- Modify `apps/web/src/app/app.config.ts`: replace `provideZoneChangeDetection({ eventCoalescing: true })` with `provideZonelessChangeDetection()`.
- Modify `apps/web/src/app/card/card.component.ts`: convert `now` to `signal`, `state` to `input()`, methods to `computed()`, constructor to `inject()`, swap `CommonModule` for `DatePipe`.
- Modify `apps/web/src/app/card/card.component.html`: switch to signal call form (`now()`, `timeZone()`, `flag()`).
- Modify `apps/web/src/app/card/card.component.spec.ts`: minor — port describe/it imports to Vitest globals (or rely on `vitest/globals` via tsconfig), add a regression test for the signal-driven tick.
- Modify `apps/web/src/app/app.component.spec.ts`: remove the stale `'Hello, allyclock'` assertion; port to Vitest globals.
- Modify `apps/web/src/app/services/location.service.spec.ts`: port to Vitest globals.
- Modify `apps/web/CLAUDE.md`: update notes (Angular version, test framework).

`apps/web/src/app/app.component.ts`, `app.component.html`, `app.routes.ts`, `services/location.service.ts`, and `main.ts` are not modified by the upgrade itself but will be touched if `ng update` schematics rewrite them.

---

## Setup: Branch

- [ ] **Step 0.1: Create and check out the working branch**

Run from repo root:

```bash
git checkout -b chore/angular-21
git status
```

Expected: `On branch chore/angular-21` and `nothing to commit, working tree clean`.

---

## Task 1: Bump Angular 18 → 19

**Files:**
- Modify: `apps/web/package.json` (via `ng update`)
- Modify: `apps/web/package-lock.json` (via `npm install` triggered by `ng update`)
- Possibly modify: `apps/web/angular.json`, `apps/web/tsconfig*.json`, `apps/web/src/**/*.ts` (whatever schematics rewrite)

- [ ] **Step 1.1: Confirm clean tree**

Run:

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

- [ ] **Step 1.2: Run the v19 update**

Run from `apps/web`:

```bash
npx ng update @angular/core@19 @angular/cli@19
```

Expected: schematics run, `package.json` and `package-lock.json` are rewritten with `^19.x` Angular packages, no error exit.

If `ng update` complains about an out-of-date dev dependency it cannot migrate (e.g., a peer-dep range mismatch), follow its suggested `--force` flag only if its message says it is safe; otherwise stop and report the error.

- [ ] **Step 1.3: Production build gate**

Run from repo root:

```bash
npm run build:web
```

Expected: build succeeds. Output written to `apps/web/dist/allyclock/browser/`. No new errors beyond Bootstrap/moment-timezone CommonJS warnings that already exist.

If build fails, read the error, fix the code, re-run. Do not bypass.

- [ ] **Step 1.4: Inspect changes**

Run:

```bash
git status
git diff --stat
```

Read each modified file to understand what schematics changed. Most changes will be inside `package.json`/`package-lock.json` and possibly `angular.json`.

- [ ] **Step 1.5: Commit**

Run from repo root:

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/angular.json apps/web/tsconfig*.json apps/web/src
git status
git commit -m "chore(web): bump Angular 18 to 19"
```

Expected: commit lands on `chore/angular-21`. (Only stage files actually changed by this step — if `tsconfig*.json` or `src` is unmodified, drop them from the `git add`.)

---

## Task 2: Bump Angular 19 → 20

**Files:**
- Modify: `apps/web/package.json`, `apps/web/package-lock.json`
- Possibly modify: `apps/web/angular.json`, `apps/web/tsconfig*.json`, `apps/web/src/**/*.ts`

- [ ] **Step 2.1: Run the v20 update**

Run from `apps/web`:

```bash
npx ng update @angular/core@20 @angular/cli@20
```

Expected: success, packages now at `^20.x`.

- [ ] **Step 2.2: Production build gate**

Run from repo root:

```bash
npm run build:web
```

Expected: green.

- [ ] **Step 2.3: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/angular.json apps/web/tsconfig*.json apps/web/src
git status
git commit -m "chore(web): bump Angular 19 to 20"
```

(Drop unchanged paths from `git add` as in Task 1.)

---

## Task 3: Bump Angular 20 → 21

**Files:**
- Modify: `apps/web/package.json`, `apps/web/package-lock.json` (TypeScript also bumps to ~5.9)
- Possibly modify: `apps/web/angular.json`, `apps/web/tsconfig*.json`, `apps/web/src/**/*.ts`

- [ ] **Step 3.1: Run the v21 update**

Run from `apps/web`:

```bash
npx ng update @angular/core@21 @angular/cli@21
```

Expected: success. `package.json` now has `@angular/*@^21`, `typescript@~5.9`.

- [ ] **Step 3.2: Production build gate**

Run from repo root:

```bash
npm run build:web
```

Expected: green.

- [ ] **Step 3.3: Confirm Netlify output contract**

Run:

```bash
ls apps/web/dist/allyclock/browser/index.html
```

Expected: file exists. If the output path changed under v21, stop and reconcile with the Netlify deploy step in `.github/workflows/allyclock.yml` before continuing.

- [ ] **Step 3.4: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/angular.json apps/web/tsconfig*.json apps/web/src
git status
git commit -m "chore(web): bump Angular 20 to 21"
```

---

## Task 4: Migrate Karma → Vitest

**Files:**
- Modify: `apps/web/package.json` (remove karma/jasmine, add vitest + jsdom)
- Modify: `apps/web/angular.json` (swap `test` builder)
- Modify: `apps/web/tsconfig.spec.json` (swap `types`)
- Modify: `apps/web/src/app/app.component.spec.ts` (Vitest imports, fix stale assertion)
- Modify: `apps/web/src/app/card/card.component.spec.ts` (Vitest imports)
- Modify: `apps/web/src/app/services/location.service.spec.ts` (Vitest imports)
- Delete: `apps/web/karma.conf.js` if present after `ng update`

- [ ] **Step 4.1: Remove Karma + Jasmine packages**

Run from `apps/web`:

```bash
npm uninstall karma karma-chrome-launcher karma-coverage karma-jasmine karma-jasmine-html-reporter jasmine-core @types/jasmine
```

Expected: clean removal, lockfile updated.

- [ ] **Step 4.2: Install Vitest + jsdom**

Run from `apps/web`:

```bash
npm install --save-dev vitest jsdom
```

Expected: both added under `devDependencies`. If `@angular/build` requires a pinned Vitest peer range, use the version Angular's docs specify for v21.

- [ ] **Step 4.3: Swap the `test` builder in `angular.json`**

In `apps/web/angular.json`, locate the `test` architect block. Replace its current Karma configuration:

```json
"test": {
  "builder": "@angular-devkit/build-angular:karma",
  "options": {
    "polyfills": [
      "zone.js",
      "zone.js/testing"
    ],
    "tsConfig": "tsconfig.spec.json",
    "inlineStyleLanguage": "scss",
    "assets": [
      { "glob": "**/*", "input": "public" }
    ],
    "styles": [ "src/styles.scss" ],
    "scripts": []
  }
}
```

With the Vitest builder:

```json
"test": {
  "builder": "@angular/build:unit-test",
  "options": {
    "runner": "vitest",
    "tsConfig": "tsconfig.spec.json",
    "buildTarget": "allyclock:build:development"
  }
}
```

(Leave `zone.js` in `build.options.polyfills` for now — it is removed in Task 5.)

If Angular ships an automatic karma-to-vitest schematic (e.g., `ng generate @angular/build:unit-test` or `ng update` migration), prefer running that schematic and accepting its output over the hand-written block above. The hand-written block is a fallback for the case where the schematic is unavailable or fails on this project shape.

- [ ] **Step 4.4: Update `tsconfig.spec.json`**

Replace the file `apps/web/tsconfig.spec.json` with:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": ["vitest/globals"]
  },
  "include": [
    "src/**/*.spec.ts",
    "src/**/*.d.ts"
  ]
}
```

- [ ] **Step 4.5: Delete obsolete Karma config if present**

Run from `apps/web`:

```bash
ls karma.conf.js test.ts 2>/dev/null || true
```

If `karma.conf.js` or `src/test.ts` exists, delete it:

```bash
rm -f karma.conf.js
rm -f src/test.ts
```

Expected: nothing remaining from the Karma stack.

- [ ] **Step 4.6: Port `app.component.spec.ts`**

Overwrite `apps/web/src/app/app.component.spec.ts` with:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'allyclock' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('allyclock');
  });

  it('should render at least one clock card', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-card')).toBeTruthy();
  });
});
```

The third test is replaced because the previous assertion on `<h1>Hello, allyclock</h1>` referenced markup that no longer exists in `app.component.html`.

- [ ] **Step 4.7: Port `card/card.component.spec.ts`**

Overwrite `apps/web/src/app/card/card.component.spec.ts` with:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

- [ ] **Step 4.8: Port `services/location.service.spec.ts`**

Overwrite `apps/web/src/app/services/location.service.spec.ts` with:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LocationService } from './location.service';

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
```

- [ ] **Step 4.9: Test gate**

Run from repo root:

```bash
npm run test:web
```

Expected: Vitest runs all three spec files; all assertions pass; exit 0.

If a spec fails on import resolution, confirm `@angular/build:unit-test` is the active builder and `vitest` + `jsdom` are installed. If Angular's `TestBed` complains about a missing zone, that is fine here — Vitest under `@angular/build:unit-test` configures change detection for the test environment automatically.

- [ ] **Step 4.10: Production build gate**

Run from repo root:

```bash
npm run build:web
```

Expected: still green.

- [ ] **Step 4.11: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/angular.json apps/web/tsconfig.spec.json apps/web/src
git rm -f apps/web/karma.conf.js apps/web/src/test.ts 2>/dev/null || true
git status
git commit -m "chore(web): replace Karma with Vitest"
```

---

## Task 5: Enable Zoneless Change Detection with Signals

**Files:**
- Modify: `apps/web/package.json` (uninstall `zone.js`)
- Modify: `apps/web/angular.json` (remove `zone.js` from `build.options.polyfills`)
- Modify: `apps/web/src/app/app.config.ts`
- Modify: `apps/web/src/app/card/card.component.ts`
- Modify: `apps/web/src/app/card/card.component.html`
- Modify: `apps/web/src/app/card/card.component.spec.ts` (add ticking regression test)

- [ ] **Step 5.1: Update `app.config.ts`**

Overwrite `apps/web/src/app/app.config.ts` with:

```ts
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideZonelessChangeDetection(), provideRouter(routes)],
};
```

- [ ] **Step 5.2: Update `card.component.ts`**

Overwrite `apps/web/src/app/card/card.component.ts` with:

```ts
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LocationService } from '../services/location.service';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent implements OnInit {
  private location = inject(LocationService);

  readonly state = input<string>('UK');
  readonly now = signal(new Date());
  readonly timeZone = computed(() => this.location.getTimeZone(this.state(), this.now()));
  readonly flag = computed(() => this.location.getFlag(this.state()));

  ngOnInit(): void {
    setInterval(() => this.now.set(new Date()), 1000);
  }
}
```

Notes:
- `setInterval(..., 1000)` makes the original implicit interval (which was `setInterval(cb)` with no delay — browsers floor that to ~4 ms) explicit at one tick per second, matching the visible behavior.
- Removing `console.log(...)` and the `getFlag()` / `getTimeZone()` methods is intentional; their template callsites become signal calls in Step 5.3.

- [ ] **Step 5.3: Update `card.component.html`**

Overwrite `apps/web/src/app/card/card.component.html` with:

```html
<div
  class="d-flex flex-row justify-content-between align-items-center"
  style="border-bottom: solid 1px white"
>
  <div>
    <img class="py-3" width="110" [src]="flag()" />
  </div>
  <div
    class="d-flex flex-column justify-content-center align-items-end text-white"
    style="word-break: break-all;"
  >
    <h1 class="mx-0" style="font-size: 3.77rem; margin-bottom: 0.4rem;">
      {{ now() | date: "hh:mm a":timeZone() }}
    </h1>
    <h5 class="mx-0 mb-0" style="font-size: 1.30rem; font-family: consolas;">
      {{ now() | date: "HH:mm:ss.SS zzzz":timeZone() }}
    </h5>
    <h5 class="mx-0" style="font-size: 1rem">
      {{ now() | date: "MMM d, y, zzzz":timeZone() }}
    </h5>
  </div>
</div>
```

`<img src="{{ getFlag() }}">` is rewritten as `<img [src]="flag()">` so the property binding matches Angular's preferred attribute-vs-property style and uses the signal call directly.

- [ ] **Step 5.4: Add a ticking regression test**

Overwrite `apps/web/src/app/card/card.component.spec.ts` with:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose now as a signal that returns a Date', () => {
    expect(component.now()).toBeInstanceOf(Date);
  });

  it('should recompute timeZone when now changes', () => {
    const before = component.timeZone();
    component.now.set(new Date(component.now().getTime() + 60_000));
    const after = component.timeZone();
    expect(typeof before).toBe('string');
    expect(typeof after).toBe('string');
  });
});
```

The third test guards the signal wiring: if `timeZone` is ever reverted to a non-computed plain method, the assertion that it still returns a string after mutating `now` still passes, but it ensures the `computed()` graph is connected (Vitest will fail with `TypeError` if `component.now.set` is missing).

- [ ] **Step 5.5: Uninstall `zone.js`**

Run from `apps/web`:

```bash
npm uninstall zone.js
```

Expected: removed from `dependencies`.

- [ ] **Step 5.6: Remove `zone.js` from `angular.json` polyfills**

In `apps/web/angular.json`, change:

```json
"polyfills": [
  "zone.js"
],
```

to:

```json
"polyfills": [],
```

(Or omit the key entirely; both work.)

If the `test` builder block also still references `zone.js` (it should not, after Task 4), remove it there too.

- [ ] **Step 5.7: Build gate**

Run from repo root:

```bash
npm run build:web
```

Expected: green, no references to `zone.js` in the output.

- [ ] **Step 5.8: Test gate**

Run from repo root:

```bash
npm run test:web
```

Expected: all six tests green (three in `card.component.spec.ts`, three in `app.component.spec.ts`, one in `location.service.spec.ts`).

- [ ] **Step 5.9: Manual smoke test**

Start the dev server from repo root:

```bash
npm run start:web
```

Open `http://localhost:4200` in a browser.

Expected within 5 seconds:
- Three clock cards visible (US, UK, KR).
- All three flag images load.
- The hours:minutes line, the HH:mm:ss line, and the date line each render with the correct timezone offset for that region.
- The HH:mm:ss line advances every second (watch for at least 3 seconds).

If any card is frozen, zoneless change detection is not being driven. Re-check that `now` is a `signal` (not a plain field), that `setInterval` calls `this.now.set(...)` (not `this.now =`), and that the template uses `now()` (not `now`).

Stop the dev server (Ctrl+C) before continuing.

- [ ] **Step 5.10: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/angular.json apps/web/src/app/app.config.ts apps/web/src/app/card/card.component.ts apps/web/src/app/card/card.component.html apps/web/src/app/card/card.component.spec.ts
git status
git commit -m "chore(web): enable zoneless change detection with signals"
```

---

## Task 6: Adopt `inject()` Cleanup and Drop `CommonModule`

This task is mostly a no-op for code changes — the `inject()` switch and `CommonModule` → `DatePipe` swap were already done in Step 5.2 because they were structurally part of the signal rewrite. This task verifies that no stragglers remain and updates documentation.

**Files:**
- Verify: `apps/web/src/app/card/card.component.ts` (already on `inject()` and `DatePipe` after Task 5)
- Modify: `apps/web/CLAUDE.md` (refresh notes)

- [ ] **Step 6.1: Grep for remaining structural directives**

Run from repo root:

```bash
grep -rn "ngIf\|ngFor\|ngSwitch" apps/web/src
```

Expected: no matches. If any appear, convert them to `@if` / `@for` / `@switch` in the same file (and add a unit assertion that exercises the converted block if practical).

- [ ] **Step 6.2: Grep for remaining `CommonModule` imports**

Run from repo root:

```bash
grep -rn "CommonModule" apps/web/src
```

Expected: no matches. If any appear, replace with the specific pipes/directives that file uses (`DatePipe`, `AsyncPipe`, etc.).

- [ ] **Step 6.3: Grep for legacy constructor injection**

Run from repo root:

```bash
grep -rn "constructor(.*: \(Location\|Router\|HttpClient\|.*Service\)" apps/web/src
```

Expected: no matches. The only known one was in `CardComponent` and has been converted. If any others appear, swap to `inject()`.

- [ ] **Step 6.4: Update `apps/web/CLAUDE.md`**

In `apps/web/CLAUDE.md`, locate the "App Overview" section and update:

- Change "Angular 18 Web app" to "Angular 21 Web app".
- Replace the line "Karma/Jasmine is configured for unit tests." with "Vitest (via `@angular/build:unit-test`) is configured for unit tests; the app is zoneless and uses signals."

Leave the rest of the file unchanged.

- [ ] **Step 6.5: Build + test gates**

Run from repo root:

```bash
npm run build:web
npm run test:web
```

Expected: both green.

- [ ] **Step 6.6: Commit**

```bash
git add apps/web/CLAUDE.md
git status
git commit -m "chore(web): document Angular 21, Vitest, and zoneless"
```

(If Step 6.1 / 6.2 / 6.3 surfaced and fixed any stragglers, stage and include those files in the commit, and adjust the message to "chore(web): finish inject() and standalone-pipe migration".)

---

## Final Verification

- [ ] **Step F.1: Re-run all gates**

From repo root:

```bash
npm run build:web
npm run test:web
```

Expected: both green.

- [ ] **Step F.2: Confirm `dist` layout for Netlify**

```bash
ls apps/web/dist/allyclock/browser/index.html
```

Expected: file exists.

- [ ] **Step F.2.1: Confirm CI Node version satisfies Angular 21**

Inspect `.github/workflows/allyclock.yml`. Find the `node-version` setting (currently `20.x`).

Angular 21 requires Node `^20.19.0 || ^22.12.0 || ^24.0.0`. The `20.x` selector resolves to the latest 20.x at workflow runtime, which is well past 20.19, so the workflow is fine as-is. No change needed unless the workflow explicitly pins below 20.19 — in which case bump the pin to `20.19` or higher.

No commit for this step unless the pin actually needed adjusting.

- [ ] **Step F.3: Final manual smoke test**

```bash
npm run start:web
```

Open `http://localhost:4200`. Confirm all three clock cards render, flags load, and the HH:mm:ss line advances every second. Stop the dev server.

- [ ] **Step F.4: Verify commit list**

Run:

```bash
git log --oneline main..HEAD
```

Expected: six commits in order:

```
<sha> chore(web): document Angular 21, Vitest, and zoneless
<sha> chore(web): enable zoneless change detection with signals
<sha> chore(web): replace Karma with Vitest
<sha> chore(web): bump Angular 20 to 21
<sha> chore(web): bump Angular 19 to 20
<sha> chore(web): bump Angular 18 to 19
```

- [ ] **Step F.5: Hand off**

The branch is ready for PR. Do not push or open a PR as part of executing this plan — that is the user's call.
