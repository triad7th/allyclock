# AllyClock Web — Angular 21 Upgrade Design

## Purpose

Bring the Web app at `apps/web` from Angular 18.1 to the current stable Angular 21, adopt the Angular 21 idioms (signals, zoneless change detection, new control flow, `inject()`), and replace the deprecated Karma test stack with Vitest via `@angular/build:unit-test`. Scope is intentionally bounded to the Web app — no iOS, no `packages/core` extraction, no replacement of `moment-timezone`.

## Context

`apps/web` is small: one `AppComponent`, one `CardComponent`, one `LocationService`, three `*.spec.ts` files, standalone-component bootstrap. The only runtime ticking is `setInterval(() => this.now = new Date())` in `CardComponent.ngOnInit`. The app uses Bootstrap 5 (global stylesheet + bundled JS via `angular.json` `styles`/`scripts`) and `moment-timezone` (declared in `allowedCommonJsDependencies`).

Versions verified against `angular.dev/reference/versions` and `angular.dev/guide/testing` on 2026-05-25:

- Angular 21.0.x is the current stable release.
- Node.js `^20.19.0 || ^22.12.0 || ^24.0.0`, TypeScript `>=5.9.0 <6.0.0`, RxJS `^6.5.3 || ^7.4.0`.
- Vitest (via `@angular/build:unit-test` builder) is the default test runner for new Angular CLI projects. Karma is still supported but no longer the default.
- Zoneless change detection is stable (`provideZonelessChangeDetection`) as of v20.
- `ng update` enforces sequential major bumps; no skipping majors.

## Final-State Stack

- `@angular/*` packages: `^21.0.x`
- `@angular/cli` and the build/test tooling now under `@angular/build` at `^21.0.x` (replaces `@angular-devkit/build-angular` for `unit-test`; build itself remains on the application builder)
- TypeScript: `~5.9`
- RxJS: `~7.8` (unchanged; still supported)
- Zone.js: **removed** (zoneless app)
- Karma / Jasmine / `karma-*`: **removed**
- Vitest + jsdom: **added**
- Bootstrap 5, moment-timezone: unchanged
- CI Node engine: GitHub Actions workflow `.github/workflows/allyclock.yml` stays on Node 20.x but documented as requiring `>=20.19`. No bump to 22 in this upgrade.

## Commit Sequence on Branch `chore/angular-21`

All work lands on one branch as a single PR, split into the commits below so each step is independently bisectable and reviewable.

1. **`chore(web): bump Angular 18 → 19`**
   - Run `ng update @angular/core@19 @angular/cli@19` from `apps/web`.
   - Let schematics run all automatic migrations.
   - Resolve any compile errors introduced by the bump.
   - Pass gate: `npm run build:web` succeeds (production config).

2. **`chore(web): bump Angular 19 → 20`**
   - Same pattern with `@20` targets.
   - Pass gate: `npm run build:web` succeeds.

3. **`chore(web): bump Angular 20 → 21`**
   - Same pattern with `@21` targets. This bump also lifts TypeScript to `~5.9`.
   - Pass gate: `npm run build:web` succeeds; Netlify-relevant output path (`apps/web/dist/allyclock/browser`) is unchanged.

4. **`chore(web): migrate Karma → Vitest`**
   - Run the official karma-to-vitest migration schematic provided by `@angular/build` (or follow the "Migrating from Karma to Vitest" guide if the schematic is unavailable for this project shape).
   - Swap `test` builder in `apps/web/angular.json` from `@angular-devkit/build-angular:karma` to `@angular/build:unit-test`.
   - Remove `karma`, `karma-chrome-launcher`, `karma-coverage`, `karma-jasmine`, `karma-jasmine-html-reporter`, `jasmine-core`, `@types/jasmine` from `devDependencies`.
   - Add `vitest`, `jsdom`, and any `@angular/build` test dependencies the schematic prescribes.
   - Port existing specs (`app.component.spec.ts`, `card/card.component.spec.ts`, `services/location.service.spec.ts`). They use plain `TestBed` and Jasmine matchers, so the port is mostly import swaps (`describe`/`it`/`expect` move from Jasmine globals to Vitest globals, `jasmine.createSpy` becomes `vi.fn()` if used).
   - Pass gate: `npm run test:web` runs all specs green under Vitest; `npm run build:web` still green.

5. **`chore(web): enable zoneless + signals`**
   - `apps/web/src/app/app.config.ts`: replace `provideZoneChangeDetection({ eventCoalescing: true })` with `provideZonelessChangeDetection()`.
   - `apps/web/angular.json`: remove `"zone.js"` from `build.options.polyfills`, and `"zone.js"` / `"zone.js/testing"` from the `test` builder's polyfills (if still present after step 4).
   - Uninstall `zone.js` from `apps/web/package.json`.
   - `apps/web/src/app/card/card.component.ts`:
     - Convert `now: Date = new Date();` to `now = signal(new Date());`
     - In `ngOnInit`, replace `this.now = new Date()` with `this.now.set(new Date())`.
     - Convert `getTimeZone()` and `getFlag()` from methods to `computed()` signals (`timeZone = computed(...)`, `flag = computed(...)`) derived from `now` and the `state` input.
     - Convert `@Input() state: string = 'UK'` to `state = input<string>('UK')` (signal input).
   - `apps/web/src/app/card/card.component.html`: change template usages from `now`/`getTimeZone()`/`getFlag()` to the signal call forms (`now()`, `timeZone()`, `flag()`). The `{{ now | date: ... : getTimeZone() }}` expressions become `{{ now() | date: ... : timeZone() }}`.
   - `apps/web/src/app/card/card.component.spec.ts`: the existing spec only asserts `toBeTruthy()` after `fixture.detectChanges()`. It does not assert against `now`/`state`/`getTimeZone()` values, so no behavioral updates are required. `fixture.detectChanges()` remains the correct way to trigger CD under zoneless tests.
   - Pass gates:
     - `npm run build:web` green.
     - `npm run test:web` green.
     - **Manual smoke test:** `npm run start:web`, open browser, confirm all rendered clock cards visibly update each second. (Zoneless regressions typically show as a frozen UI; this is the targeted check.)

6. **`chore(web): adopt `inject()` and drop `CommonModule`**
   - Templates in this codebase use no `*ngIf` / `*ngFor` / `*ngSwitch`, so the new control-flow migration is a no-op here. (If a future change introduces structural directives, prefer `@if` / `@for` / `@switch` from the start.)
   - `apps/web/src/app/card/card.component.ts`:
     - Replace `constructor(public location: LocationService) {}` with `private location = inject(LocationService);`. Templates call `getFlag()` / `getTimeZone()` (now `flag()` / `timeZone()` after step 5), not `location` directly, so privatization is safe.
     - Drop `CommonModule` from `imports`. Replace with the standalone pipes the template actually uses — currently just `DatePipe` (`imports: [DatePipe]`).
   - Pass gates: `npm run build:web` green; `npm run test:web` green; manual smoke test still shows ticking cards with flags and offsets.

## Validation Strategy

Per-commit gates (above) are the bisect-friendly checks. The branch as a whole is "done" when:

- `npm run build:web` (production) succeeds with no new warnings beyond those present on `main` before the upgrade.
- `npm run test:web` runs all three spec files under Vitest with zero failures.
- A local `npm run start:web` shows all clock cards (UK, US, KR) rendering correct flags, time, and timezone offsets, with the time advancing every second.
- `apps/web/dist/allyclock/browser` exists after build and contains `index.html` (Netlify deploy contract).
- `.github/workflows/allyclock.yml` runs to green on the PR (no workflow edits required).

## Risks & Mitigations

- **moment-timezone CommonJS interop.** Already listed under `allowedCommonJsDependencies`. If the v21 build emits a new error rather than a warning, switch the import in `LocationService` from `import * as moment from 'moment-timezone'` to `import moment from 'moment-timezone'` (default-import form, ESM-friendly). Full replacement of moment-timezone is out of scope.
- **Bootstrap JS in `scripts[]`.** Loaded as a non-module bundle; the application builder has handled this across versions, but verify after step 3 that the Bootstrap dropdowns/modals (if any rendered) still initialize. If broken, swap the `scripts[]` entry for an ES module import in `main.ts`.
- **Vitest + jsdom vs Karma + headless Chrome.** Different DOM environment. The existing specs are simple `TestBed` setups and should port cleanly. If a spec uses a browser-only API jsdom lacks, port that spec to use the relevant Vitest browser-mode shim or stub the API directly.
- **Zoneless ticking.** The `setInterval` callback no longer triggers change detection automatically; mutating a signal does. Step 5 is structured to make this conversion the same commit that flips zoneless on, so the failure mode (frozen UI) is caught immediately by the manual smoke test.
- **Netlify deploy artifact path.** Build output path is `dist/allyclock` with `browser/` subdirectory created by the application builder; the workflow uploads `apps/web/dist/allyclock/browser`. This contract is preserved by Angular's application builder across 18→21, but verify after step 3.

## Out of Scope

- iOS app (`apps/ios`), iOS CI.
- `packages/core` extraction.
- Replacing `moment-timezone` (e.g., with `Intl.DateTimeFormat` or Luxon).
- Replacing Bootstrap or restyling the app.
- Adding new product features.
- Bumping CI Node to 22.x or adding multi-Node matrix.
- Adding e2e/Cypress/Playwright tests.
