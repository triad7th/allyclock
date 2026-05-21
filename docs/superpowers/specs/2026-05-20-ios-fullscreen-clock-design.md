# AllyClock iOS — Full-Screen Clock Design

**Status:** Approved, ready for implementation planning.
**Target:** Single-objective spec — the first user-facing feature of the iOS app after the scaffold.

## Goal

Replace the placeholder `ContentView` with a beautiful, minimalist, full-screen landscape clock that:

- Looks tuned (not generic) on every iPhone and iPad model from iPhone 8 (iOS 16.0 minimum) through current iPad Pro 13".
- Follows the OS appearance (dark / light) automatically.
- Follows the device's locale for the 12-hour vs 24-hour time format.
- Stays awake while foregrounded, so the app can be used as a bedside or desk clock.

## Decisions (locked in brainstorming)

- **Content:** big time + small AM/PM superscript + single info line.
  - Big block: `HH:MM` (locale-formatted) with right-side superscripted `AM/PM` (omitted on 24-hour locales).
  - Info line: `HH:mm:ss.SS   ·   <month-name> <day>, <year> · GMT±HH:MM` — one horizontal line, monospaced for the time portion.
- **Orientation:** landscape lock (left + right). iPhone and iPad both. No portrait.
- **Time format:** follow OS locale. en_US → 12h with AM/PM; ko_KR / en_GB → 24h, AM/PM omitted.
- **Precise line:** always 24-hour with leading zeros and hundredths of a second, regardless of locale. It's diagnostic; consistency matters more than localization.
- **Screen sleep:** stay awake while AllyClock is foregrounded (`isIdleTimerDisabled = true`). Reverts on background.
- **Status bar:** hidden. Plus `.persistentSystemOverlays(.hidden)` so the iPad home-indicator strip dims.
- **Interactions:** none in v1. Pure display.
- **Update mechanism:** SwiftUI `TimelineView(.animation(minimumInterval: 1/30))`. Declarative, auto-pauses on background, ~30 fps is enough for smooth hundredths.
- **Colors:** SwiftUI semantic. `Color(.systemBackground)` for the background (pure `#000` dark / `#FFF` light), `Color.primary` for the big time at full opacity, `Color.primary.opacity(0.55)` for the info line, `Color.primary.opacity(0.22)` for the middle-dot separator.

## File Layout

```
apps/ios/AllyClock/
├── AllyClockApp.swift           // existing — adds idle-timer + landscape lock
├── ContentView.swift            // existing — body becomes `ClockView()`
├── Views/
│   ├── ClockView.swift          // TimelineView + GeometryReader scaffold
│   ├── BigTime.swift            // big HH:MM + optional AM/PM superscript
│   └── InfoLine.swift           // precise time + middle dot + date+TZ
└── Time/
    ├── ClockFormatter.swift     // pure formatters (locale + TZ injected)
    └── ClockSizing.swift        // bucket detection + per-bucket ratio table

apps/ios/AllyClockTests/
└── ClockFormatterTests.swift    // formatter coverage (existing AllyClockTests.swift removed)
```

Each file has one job. Views know nothing about formatting; the formatter knows nothing about SwiftUI; sizing logic is pure functions over `CGSize` + `UserInterfaceSizeClass`.

## Components

**`AllyClockApp`** — app entry. App-wide concerns only:

- Hosts `ContentView()` (which body is `ClockView()`).
- On `ScenePhase` transitions: sets `UIApplication.shared.isIdleTimerDisabled` to `true` when active, `false` on `.background`.
- Sets supported orientations via `Info.plist` (landscape-only) so `AppDelegate.supportedInterfaceOrientationsFor:` isn't needed.

**`ClockView`** — the only screen.

- Wraps the body in `TimelineView(.animation(minimumInterval: 1/30))` for ticks.
- Wraps content in `GeometryReader` for size-based scaling.
- Reads `\.horizontalSizeClass` from the environment and the `geo.size` to pick a `SizeBucket` from `ClockSizing`.
- Composes `BigTime` and `InfoLine` in a centered `VStack`.
- Applies `.statusBar(hidden: true)`, `.persistentSystemOverlays(.hidden)`, `.dynamicTypeSize(.medium)`, `.background(Color(.systemBackground).ignoresSafeArea())`.

**`BigTime`** — receives `(time: String, ampm: String?, bucket: SizeBucket, heightUnit: CGFloat)`.

- Renders the big time numerals via `Text` with `.font(.system(size: bucket.bigSize(in: heightUnit), weight: bucket.bigWeight)).monospacedDigit()`.
- If `ampm` is non-nil, renders an `HStack(alignment: .firstTextBaseline)` with the digits and a small AM/PM `Text` to the right. The AM/PM uses `.baselineOffset(bucket.bigSize(in: heightUnit) * 0.55)` to sit visually as a superscript.
- Applies `.lineLimit(1)` + `.minimumScaleFactor(0.6)` defensively.

**`InfoLine`** — receives `(precise: String, dateTZ: String, bucket: SizeBucket, heightUnit: CGFloat)`.

- One `HStack(alignment: .firstTextBaseline, spacing: bucket.infoSize(in: heightUnit) * 0.6)`:
  - `Text(precise)` — `.system(size: infoSize, weight: .regular, design: .monospaced)`.
  - `Text("·")` — same size, `.opacity(0.4)`.
  - `Text(dateTZ)` — same size, default design.
- Color: `Color.primary.opacity(0.55)`.
- Applies `.environment(\.layoutDirection, .leftToRight)`. The info line composes Latin-numeric time, a separator, and a date string whose components already include their own RTL handling; pinning the outer stack to LTR keeps the time on the left and the date on the right in RTL locales like `ar_SA`, matching the approved mockup.

**`ClockFormatter`** — three pure static functions, all parameterized on `(date: Date, timeZone: TimeZone, locale: Locale)`:

- `bigTime(...) -> (digits: String, ampm: String?)` — returns the locale-appropriate hour-and-minute display string (no AM/PM symbol embedded) plus an optional AM/PM string drawn from `Locale.amSymbol` / `Locale.pmSymbol`. `ampm` is `nil` when `locale.hourCycle ∈ {.zeroToTwentyThree, .oneToTwentyFour}`. Hour-minute formatting respects locale numerals (e.g., Eastern Arabic digits for `ar_SA` when the device is configured for them) by going through `DateFormatter` with a localized template — never hand-formatted with `%02d`.
- `precise(...) -> String` — `String(format: "%02d:%02d:%02d.%02d", h, m, s, hundredths)`. Always 24-hour, always Latin digits, always `Calendar(identifier: .gregorian)` with the supplied time zone. Locale is intentionally ignored here — the precise line is diagnostic and must look identical across locales.
- `dateTZ(...) -> String` — `"\(date.formatted(.dateTime.year().month(.wide).day().locale(locale).timeZone(timeZone))) · \(gmtOffset(timeZone, for: date))"`. The offset is rendered as `GMT±HH:MM` from `timeZone.secondsFromGMT(for: date)`. Date portion uses the locale's calendar (so `ar_SA` gets Hijri-formatted dates if the device is set that way); the `GMT±HH:MM` suffix stays Western/Latin.

**`ClockSizing`** — bucket detection + ratios.

```swift
enum SizeBucket {
    case compactPhone   // iPhone SE / 8 / 13 mini
    case standardPhone  // iPhone 13 → 17 Pro Max
    case tablet         // every iPad

    static func detect(size: CGSize, horizontal: UserInterfaceSizeClass?) -> SizeBucket {
        if horizontal == .regular { return .tablet }
        return size.height < 400 ? .compactPhone : .standardPhone
    }
}
```

Per-bucket ratios (all `× geo.size.height` unless noted):

| Property | compactPhone | standardPhone | tablet |
|---|---|---|---|
| Big time size | 0.58 | 0.55 | `max(0.46 × h, 0.32 × w)` |
| AM/PM size (× big time) | 0.22 | 0.20 | 0.18 |
| Info line size | 0.040 | 0.035 | 0.030 |
| Stack gap | 0.030 | 0.040 | 0.055 |
| Edge padding (× min(w,h)) | 0.035 | 0.040 | 0.050 |
| Big time weight | `.ultraLight` | `.ultraLight` | `.thin` |

Why the tablet outlier on big time: iPad landscape is ~4:3 (wider). A pure `0.46 × height` rule alone can leave the digits looking short relative to the canvas, so we let the formula expand to `0.32 × width` whenever that's larger. iPhone landscapes (~16:9) stay height-bound.

## Behavior Rules

- **Orientation:** `Info.plist` (auto-generated) keys set via `INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone` and `_iPad` in `project.pbxproj`, with only `UIInterfaceOrientationLandscapeLeft` + `UIInterfaceOrientationLandscapeRight`. No portrait variant.
- **Idle timer:** `UIApplication.shared.isIdleTimerDisabled = true` on `.active`; `false` on `.background`.
- **Status bar:** hidden via `.statusBar(hidden: true)`; iPad home indicator dimmed via `.persistentSystemOverlays(.hidden)`.
- **Dynamic Type:** locked to `.medium` for the clock view. Accessibility text scaling shouldn't deform a glanceable layout; users who need oversized system text aren't the target of a wall-clock app.
- **Locale switching at runtime:** every formatter call re-reads `Locale.current` and `TimeZone.current`, so a language switch or time-zone crossing reflects within one tick (~33 ms).
- **DST:** handled implicitly by `Date.FormatStyle` and `TimeZone.secondsFromGMT(for:)`.
- **Background → foreground:** `TimelineView` auto-pauses and resumes; first new tick refreshes everything.

## Testing

### Unit tests — `AllyClockTests/ClockFormatterTests.swift`

`ClockFormatter` is the only piece with non-trivial logic. All tests pass fixed `Date`, `TimeZone`, and `Locale`, so behavior is deterministic regardless of when or where the suite runs. The existing `testContentViewCanBeCreated` test is replaced by this file (the placeholder is no longer the production view).

| Test | Inputs | Expected |
|---|---|---|
| `bigTime_en_US_PM` | 2026-05-20 14:42, en_US, PST | digits `"2:42"`, ampm `"PM"` |
| `bigTime_en_US_AM` | 2026-05-20 02:42, en_US, PST | digits `"2:42"`, ampm `"AM"` |
| `bigTime_en_US_midnight` | 2026-05-20 00:00, en_US, PST | digits `"12:00"`, ampm `"AM"` |
| `bigTime_en_US_noon` | 2026-05-20 12:00, en_US, PST | digits `"12:00"`, ampm `"PM"` |
| `bigTime_ko_KR_24h` | 2026-05-20 14:42, ko_KR, KST | digits `"14:42"`, ampm `nil` |
| `bigTime_en_GB_24h` | 2026-05-20 14:42, en_GB, UTC | digits `"14:42"`, ampm `nil` |
| `precise_isAlways24h` | 2026-05-20 02:42:38.27, any locale | `"02:42:38.27"` |
| `dateTZ_LosAngeles` | 2026-05-20, en_US, PST | `"May 20, 2026 · GMT−07:00"` |
| `dateTZ_Seoul` | 2026-05-20, ko_KR, KST | `"2026년 5월 20일 · GMT+09:00"` |
| `dateTZ_UTC` | 2026-05-20, en_GB, UTC | contains `"GMT+00:00"` |

All ten run inside the existing `xcodebuild test` invocation — no new test infrastructure.

### Visual previews — `ClockView.swift`

Manual eyeballing in Xcode previews (not automated). The preview matrix:

- **Phones (landscape, dark + light, en_US):** iPhone SE 3rd gen (375 pt), iPhone 13 mini (375 pt), iPhone 14 (390 pt), iPhone 16 Pro (393 pt), iPhone 16 Pro Max (430 pt).
- **Tablets (landscape, dark, en_US):** iPad mini (744 pt), iPad Air (820 pt), iPad Pro 11" (834 pt), iPad Pro 13" (1024 pt).
- **Locale outliers (one device each, dark):** ko_KR (24h, verify AM/PM omission and that the digits stay centered without layout jiggle), ja_JP (CJK rendering in the date portion), ar_SA (RTL + 24h — verify the info-line layout stays time-left / date-right thanks to the LTR pin, and that the date portion still renders right-to-left inside its own segment).

Bucket ratios get tuned by eye against this matrix during implementation until every preview looks intentional. Any device released after ship inherits the closest bucket's ratios automatically.

## Out of Scope (parked for future objectives)

- Multi-region clocks (the web app's flag cards).
- Tap / swipe interactions (dim, toggle 24h, theme override).
- Settings screen — manual locale / timezone / theme overrides.
- Widgets, Live Activities, lock-screen complications.
- A real App Icon design — the scaffold's placeholder slot is unchanged.
- iOS CI — local-only validation continues.
- Portrait orientation.

## Verification at Completion

A reviewer can verify the work by:

1. `xcodebuild test` on iPhone 17 sim with iOS 26.2 — all formatter tests pass.
2. Open the project in Xcode, open `ClockView.swift`, observe every preview variant renders cleanly with no overflow, no clipping, and a hand-tuned look per bucket.
3. Run on a physical iPhone 8 (or iPhone SE simulator) in landscape — the time is fully readable from arm's length, the precise line is legible from working distance, idle timer stays disabled, status bar is hidden, both landscape orientations work, dark/light switches as expected when toggling system appearance.
