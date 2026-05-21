# AllyClock iOS Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a buildable native SwiftUI iOS app scaffold under `apps/ios` that supports iPhone 8 through an iOS 16.0 minimum deployment target.

**Architecture:** The iOS app is isolated under `apps/ios` with its own Xcode project, Swift source, tests, lint/format config, and app-specific agent guidance. The scaffold intentionally avoids shared product logic and keeps the first screen minimal so the first implementation validates project structure rather than app behavior.

**Tech Stack:** Xcode 26.2 locally, SwiftUI, Swift language mode 5, XCTest, SwiftLint, SwiftFormat, XcodeBuildMCP or `xcodebuild` for simulator validation.

---

## File Structure

- Create `apps/ios/AllyClock.xcodeproj/project.pbxproj`: native Xcode project with one app target and one unit test target.
- Create `apps/ios/AllyClock.xcodeproj/project.xcworkspace/contents.xcworkspacedata`: workspace metadata for opening the project.
- Create `apps/ios/AllyClock/AllyClockApp.swift`: SwiftUI app entry point.
- Create `apps/ios/AllyClock/ContentView.swift`: minimal placeholder UI.
- Create `apps/ios/AllyClock/Assets.xcassets/Contents.json`: asset catalog root.
- Create `apps/ios/AllyClock/Assets.xcassets/AccentColor.colorset/Contents.json`: default accent color asset.
- Create `apps/ios/AllyClock/Assets.xcassets/AppIcon.appiconset/Contents.json`: generated app icon slot with no custom image files.
- Create `apps/ios/AllyClock/Preview Content/Preview Assets.xcassets/Contents.json`: SwiftUI preview asset catalog.
- Create `apps/ios/AllyClockTests/AllyClockTests.swift`: XCTest coverage for the minimal scaffold.
- Create `apps/ios/.swiftlint.yml`: iOS-local lint config following sibling project style.
- Create `apps/ios/.swiftformat`: iOS-local format config following sibling project style.
- Create `apps/ios/AGENTS.md`: iOS app instructions and validation commands.
- Modify `.gitignore`: ignore iOS build artifacts and Xcode user state if missing.
- Modify root `AGENTS.md`: include `apps/ios` as the native iOS app location and mention iOS validation once available.
- Modify `README.md`: mention the iOS scaffold path and local build command.

## Task 1: Add iOS App Source

**Files:**
- Create: `apps/ios/AllyClock/AllyClockApp.swift`
- Create: `apps/ios/AllyClock/ContentView.swift`
- Create: `apps/ios/AllyClockTests/AllyClockTests.swift`

- [ ] **Step 1: Create app directories**

Run:

```bash
mkdir -p apps/ios/AllyClock apps/ios/AllyClockTests
```

Expected: directories exist and `git status --short` shows no tracked changes yet.

- [ ] **Step 2: Create `AllyClockApp.swift`**

Write `apps/ios/AllyClock/AllyClockApp.swift`:

```swift
import SwiftUI

@main
struct AllyClockApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

- [ ] **Step 3: Create `ContentView.swift`**

Write `apps/ios/AllyClock/ContentView.swift`:

```swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 12) {
            Text("AllyClock")
                .font(.largeTitle)
                .fontWeight(.semibold)

            Text("iOS scaffold ready")
                .font(.body)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
```

- [ ] **Step 4: Create unit test**

Write `apps/ios/AllyClockTests/AllyClockTests.swift`:

```swift
import XCTest
@testable import AllyClock

final class AllyClockTests: XCTestCase {
    func testContentViewCanBeCreated() {
        let view = ContentView()

        XCTAssertNotNil(view)
    }
}
```

- [ ] **Step 5: Format Swift source**

Run:

```bash
swiftformat apps/ios/AllyClock apps/ios/AllyClockTests
```

Expected: command exits 0.

## Task 2: Add Asset Catalogs

**Files:**
- Create: `apps/ios/AllyClock/Assets.xcassets/Contents.json`
- Create: `apps/ios/AllyClock/Assets.xcassets/AccentColor.colorset/Contents.json`
- Create: `apps/ios/AllyClock/Assets.xcassets/AppIcon.appiconset/Contents.json`
- Create: `apps/ios/AllyClock/Preview Content/Preview Assets.xcassets/Contents.json`

- [ ] **Step 1: Create asset directories**

Run:

```bash
mkdir -p "apps/ios/AllyClock/Assets.xcassets/AccentColor.colorset" \
  "apps/ios/AllyClock/Assets.xcassets/AppIcon.appiconset" \
  "apps/ios/AllyClock/Preview Content/Preview Assets.xcassets"
```

Expected: directories exist.

- [ ] **Step 2: Create asset catalog root**

Write `apps/ios/AllyClock/Assets.xcassets/Contents.json`:

```json
{
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
```

- [ ] **Step 3: Create accent color set**

Write `apps/ios/AllyClock/Assets.xcassets/AccentColor.colorset/Contents.json`:

```json
{
  "colors" : [
    {
      "idiom" : "universal"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
```

- [ ] **Step 4: Create generated app icon slot**

Write `apps/ios/AllyClock/Assets.xcassets/AppIcon.appiconset/Contents.json`:

```json
{
  "images" : [
    {
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    },
    {
      "appearances" : [
        {
          "appearance" : "luminosity",
          "value" : "dark"
        }
      ],
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    },
    {
      "appearances" : [
        {
          "appearance" : "luminosity",
          "value" : "tinted"
        }
      ],
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
```

- [ ] **Step 5: Create preview asset catalog root**

Write `apps/ios/AllyClock/Preview Content/Preview Assets.xcassets/Contents.json`:

```json
{
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
```

## Task 3: Add Native Xcode Project

**Files:**
- Create: `apps/ios/AllyClock.xcodeproj/project.pbxproj`
- Create: `apps/ios/AllyClock.xcodeproj/project.xcworkspace/contents.xcworkspacedata`

- [ ] **Step 1: Create project directories**

Run:

```bash
mkdir -p apps/ios/AllyClock.xcodeproj/project.xcworkspace
```

Expected: project directory exists.

- [ ] **Step 2: Create workspace metadata**

Write `apps/ios/AllyClock.xcodeproj/project.xcworkspace/contents.xcworkspacedata`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Workspace
   version = "1.0">
   <FileRef
      location = "self:">
   </FileRef>
</Workspace>
```

- [ ] **Step 3: Create Xcode project**

Write `apps/ios/AllyClock.xcodeproj/project.pbxproj` as a native Xcode project file with:

- Project object name `AllyClock`
- App target `AllyClock`
- Unit test target `AllyClockTests`
- `PRODUCT_BUNDLE_IDENTIFIER = com.allyworld.AllyClock`
- `DEVELOPMENT_TEAM = 77R8AFM4HU`
- `IPHONEOS_DEPLOYMENT_TARGET = 16.0`
- `TARGETED_DEVICE_FAMILY = "1,2"`
- `SWIFT_VERSION = 5.0`
- `GENERATE_INFOPLIST_FILE = YES`
- `ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon`
- Source files from `AllyClock/AllyClockApp.swift` and `AllyClock/ContentView.swift`
- Test file from `AllyClockTests/AllyClockTests.swift`
- Resource build phase with `AllyClock/Assets.xcassets` and `AllyClock/Preview Content`

After writing `apps/ios/AllyClock.xcodeproj/project.pbxproj`, run:

```bash
xcodebuild -list -project apps/ios/AllyClock.xcodeproj
```

Expected: output lists project `AllyClock` and scheme `AllyClock`.

## Task 4: Add iOS Tooling and Guidance

**Files:**
- Create: `apps/ios/.swiftlint.yml`
- Create: `apps/ios/.swiftformat`
- Create: `apps/ios/AGENTS.md`
- Modify: `.gitignore`
- Modify: `AGENTS.md`
- Modify: `README.md`

- [ ] **Step 1: Create SwiftLint config**

Write `apps/ios/.swiftlint.yml`:

```yaml
included:
  - AllyClock
  - AllyClockTests

excluded:
  - AllyClock.xcodeproj
  - build
  - DerivedData
  - "**/.build"

line_length:
  warning: 120
  error: 200
  ignores_comments: true
  ignores_urls: true

identifier_name:
  min_length: 2
  excluded:
    - id
    - x
    - y

type_name:
  min_length: 3

file_length:
  warning: 600
  error: 1000

function_body_length:
  warning: 80
  error: 150

disabled_rules:
  - trailing_whitespace
  - todo

opt_in_rules:
  - empty_count
  - closure_spacing
  - explicit_init
  - first_where
  - force_unwrapping
  - redundant_nil_coalescing
  - sorted_imports
  - unused_import
```

- [ ] **Step 2: Create SwiftFormat config**

Write `apps/ios/.swiftformat`:

```text
--swiftversion 5.0
--indent 4
--maxwidth 100
--tabwidth 8
--linebreaks lf
--semicolons never
--commas always
--trimwhitespace always
--wraparguments preserve
--wrapparameters preserve
--wrapcollections preserve
--self remove
--header ignore

--exclude AllyClock.xcodeproj,build,DerivedData,.build
```

- [ ] **Step 3: Create iOS agent guidance**

Write `apps/ios/AGENTS.md`:

```markdown
# AGENTS.md

Guidance for coding agents working in the AllyClock iOS app.

## App Overview

This directory contains the native SwiftUI iOS app for AllyClock.

- Xcode project: `AllyClock.xcodeproj`
- App target: `AllyClock`
- Test target: `AllyClockTests`
- Minimum deployment target: iOS 16.0 for iPhone 8 support
- Device family: iPhone and iPad

## Commands

Build for simulator:

```sh
xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 16' build
```

Run unit tests:

```sh
xcodebuild -project AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 16' test
```

Lint and format:

```sh
swiftlint
swiftformat AllyClock AllyClockTests
```

## Conventions

- Keep SwiftUI views small and focused.
- Guard APIs newer than iOS 16 with `if #available(...)`.
- Do not raise the deployment target without confirming iPhone 8 support is no longer required.
- Keep product logic out of the scaffold until shared clock requirements are designed.
```

- [ ] **Step 4: Update root `.gitignore`**

Ensure `.gitignore` contains these Xcode ignore patterns:

```gitignore
# Xcode
xcuserdata/
DerivedData/
build/
*.hmap
*.ipa
*.dSYM.zip
*.dSYM
*.xcbkptlist
```

- [ ] **Step 5: Update root docs**

Update `AGENTS.md` and `README.md` so they mention:

- `apps/ios` contains the native SwiftUI app.
- iOS minimum target is 16.0 for iPhone 8 support.
- iOS workflow/CI is intentionally not added yet.
- Build validation uses XcodeBuildMCP or `xcodebuild` from `apps/ios`.

## Task 5: Validate and Commit

**Files:**
- Verify all files from Tasks 1-4.

- [ ] **Step 1: Check XcodeBuildMCP defaults**

Call `session_show_defaults`.

Expected: inspect whether project, scheme, and simulator defaults are already configured.

- [ ] **Step 2: Configure XcodeBuildMCP defaults if needed**

If defaults are missing or wrong, call `session_set_defaults` with:

- `projectPath`: `apps/ios/AllyClock.xcodeproj`
- `scheme`: `AllyClock`
- `simulatorName`: an installed iOS simulator from `list_sims`
- `simulatorPlatform`: `iOS Simulator`
- `bundleId`: `com.allyworld.AllyClock`

- [ ] **Step 3: Build for simulator**

Use XcodeBuildMCP `build_sim` with no extra args.

Fallback command:

```bash
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 16' build
```

Expected: build succeeds.

- [ ] **Step 4: Run tests**

Use XcodeBuildMCP `test_sim`.

Fallback command:

```bash
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 16' test
```

Expected: `AllyClockTests/testContentViewCanBeCreated` passes.

- [ ] **Step 5: Run lint and format checks**

Invoke the repo skill:

```text
$allyclock-ios-lint-format
```

The skill runs the equivalent of:

```bash
cd apps/ios && swiftlint
cd apps/ios && swiftformat --lint AllyClock AllyClockTests
```

Expected: both commands exit 0.

- [ ] **Step 6: Check repository state**

Run:

```bash
git status --short
git diff --check
```

Expected: only intended scaffold files are changed and `git diff --check` exits 0.

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/ios .gitignore AGENTS.md README.md
git commit -m "ios: scaffold native AllyClock app" \
  -m "Why:" \
  -m "- AllyClock needs a native SwiftUI app target inside the multi-app repository." \
  -m "What:" \
  -m "- Add an iOS Xcode project, minimal SwiftUI app, unit test target, and iOS-local tooling." \
  -m "- Configure the app for iPhone and iPad with an iOS 16.0 minimum target for iPhone 8 support." \
  -m "Checks:" \
  -m "- xcodebuild simulator build: passed" \
  -m "- xcodebuild simulator test: passed" \
  -m "- swiftlint: passed" \
  -m "- swiftformat --lint AllyClock AllyClockTests: passed"
```

Expected: one commit is created.
