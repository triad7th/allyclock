# AllyClock

AllyClock is a multi-app repository. The current production app is the Angular Web app in `apps/web`.

## Web App

Install Web dependencies:

```sh
npm --prefix apps/web ci
```

Run the Web app locally:

```sh
npm run start:web
```

Build the Web app:

```sh
npm run build:web
```

Run Web unit tests:

```sh
npm run test:web
```

The Web production build is emitted under `apps/web/dist/allyclock/browser`.

## iOS App

The native SwiftUI iOS app lives in `apps/ios` with `AllyClock.xcodeproj`. The minimum deployment target is iOS 16.0 so iPhone 8 is supported. iOS CI is intentionally not wired up yet; validate the build locally via XcodeBuildMCP or `xcodebuild` from `apps/ios`.

Build for an iOS simulator:

```sh
xcodebuild -project apps/ios/AllyClock.xcodeproj -scheme AllyClock -destination 'platform=iOS Simulator,name=iPhone 16' build
```

See `apps/ios/AGENTS.md` for the full iOS workflow.

## Deployment

GitHub Actions builds `apps/web` and deploys the browser output to Netlify.
