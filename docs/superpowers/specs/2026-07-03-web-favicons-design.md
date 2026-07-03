# AllyClock Modern Web Favicons

**Date:** 2026-07-03

## Goal

Give the AllyClock Web app a complete, modern favicon set derived from the approved deterministic AllyClock clock icon. Browser tabs, bookmarks, iOS home-screen shortcuts, and installed Web experiences should all use the same artwork.

## Canonical Artwork

Use `assets/app-icon/png/ios/AllyClock-AppIcon-1024.png` as the sole source image. Do not use or modify the untracked `apps/web/public/icon-v2.png`.

The generated files must preserve the source image's opaque square composition and deep-teal background. Browsers and operating systems may apply their own masks or corner treatment.

## Generated Assets

Place the following committed outputs in `apps/web/public`:

- `favicon.ico`, containing 16, 32, and 48 pixel layers.
- `favicon-16x16.png`.
- `favicon-32x32.png`.
- `apple-touch-icon.png`, 180 by 180 pixels.
- `icon-192.png`, 192 by 192 pixels.
- `icon-512.png`, 512 by 512 pixels.
- `site.webmanifest`.

Generate raster variants with high-quality downsampling from the canonical 1024-pixel PNG. Keep a deterministic renderer in `assets/app-icon` so future icon revisions can reproduce the complete set.

## HTML and Manifest Integration

Update `apps/web/src/index.html` to declare:

- The multi-resolution `.ico` favicon.
- Explicit 16- and 32-pixel PNG favicons.
- The 180-pixel Apple touch icon.
- The Web manifest.
- A deep-teal `theme-color` matching the icon background.

The manifest will identify the app as `AllyClock`, use `standalone` display mode, and declare the 192- and 512-pixel PNGs with `any` purpose. Its theme and background colors will use the icon's deep teal.

## Reproducibility and Validation

The renderer will fail clearly if its canonical source is missing or has unexpected dimensions. Running it twice without source changes must produce byte-identical outputs.

Validation will cover:

- Correct PNG dimensions and opacity.
- Required ICO layers.
- Valid manifest JSON and expected icon declarations.
- Correct favicon, Apple touch icon, manifest, and theme-color links in the built `index.html`.
- A successful production Web build.

## Scope Boundaries

This work does not add service-worker behavior, offline caching, install prompts, or broader PWA functionality. It does not modify the Apple-platform icon pack or unrelated in-progress Web changes.
