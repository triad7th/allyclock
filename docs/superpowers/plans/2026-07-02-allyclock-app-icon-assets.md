# AllyClock App Icon Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a portable AllyClock icon pack with editable SVG sources and verified PNG exports for iOS, watchOS, and tvOS.

**Architecture:** Use one square vector composition for iOS and watchOS, adapting its canvas from 1024×1024 to 1088×1088 without changing the approved 77% clock ratio. Use a separate 800×480 tvOS composition split into background and transparent foreground layers for parallax, plus a flattened preview. Keep all deliverables under `assets/app-icon/` so another coding agent can import them without touching application code.

**Tech Stack:** SVG 1.1, sRGB color, Python, Pillow, NumPy, PNG, `xmllint`, `sips`, and Xcode asset catalogs.

---

## File Structure

- `assets/app-icon/README.md` — platform mapping, dimensions, colors, and import notes.
- `assets/app-icon/render_pngs.py` — deterministic 4× antialiased raster renderer using the SVG coordinates and palette.
- `assets/app-icon/source/AllyClock-AppIcon-Square.svg` — editable 1024×1024 source for iOS.
- `assets/app-icon/source/AllyClock-AppIcon-Watch.svg` — editable 1088×1088 watchOS source with the same 77% composition inside the circular system mask.
- `assets/app-icon/source/AllyClock-AppIcon-tvOS-Background.svg` — editable 800×480 full-bleed teal background layer.
- `assets/app-icon/source/AllyClock-AppIcon-tvOS-Foreground.svg` — editable 800×480 transparent clock layer kept inside the tvOS focus safe area.
- `assets/app-icon/png/ios/AllyClock-AppIcon-1024.png` — square iOS import asset.
- `assets/app-icon/png/watchos/AllyClock-AppIcon-1088.png` — square watchOS import asset.
- `assets/app-icon/png/tvos/AllyClock-AppIcon-Background-800x480.png` — tvOS back layer.
- `assets/app-icon/png/tvos/AllyClock-AppIcon-Foreground-800x480.png` — tvOS transparent front layer.
- `assets/app-icon/png/tvos/AllyClock-AppIcon-Flattened-800x480.png` — flattened visual reference, not a replacement for the layer stack.

Apple's current specifications use 1024×1024 for iOS, 1088×1088 for watchOS, and an 800×480 layered parallax icon for tvOS. See [App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons) and [Configuring your app icon using an asset catalog](https://developer.apple.com/documentation/xcode/configuring-your-app-icon/).

### Task 1: Create the square iOS vector master

**Files:**
- Create: `assets/app-icon/source/AllyClock-AppIcon-Square.svg`

- [ ] **Step 1: Create the 1024×1024 SVG canvas**

Use a full-bleed square with no baked rounded-corner mask:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="teal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#416F76"/>
      <stop offset="1" stop-color="#244D56"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="25" stdDeviation="18" flood-color="#17343A" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect width="1024" height="1024" fill="url(#teal)"/>
  <!-- Clock center: 512, 495. Outer diameter: 788. -->
</svg>
```

- [ ] **Step 2: Add the approved 77% clock geometry**

Add, in order: a near-black outer circle with radius 394; an ivory dial with radius 353 and a 21 px warm-metal keyline; four rounded cardinal indices; seven intermediate indices matching the approved mockup; broad rounded hour/minute hands set to 10:08; and the coral seconds hand and hub. Use the exact colors `#10171A`, `#F5F0E5`, `#B58A4E`, `#22262A`, `#7E7B74`, and `#C85F50` from the design spec.

- [ ] **Step 3: Validate the SVG structure**

Run:

```bash
xmllint --noout assets/app-icon/source/AllyClock-AppIcon-Square.svg
```

Expected: exit code 0 with no output.

### Task 2: Create the watchOS vector source

**Files:**
- Create: `assets/app-icon/source/AllyClock-AppIcon-Watch.svg`

- [ ] **Step 1: Adapt the square composition to 1088×1088**

Use a full-bleed 1088×1088 square. Scale all square-master coordinates by `1.0625`, keeping the clock at 77% of the canvas. Do not bake in a circular crop; watchOS applies the circular system mask. Preserve the teal field at the corners so the icon does not blend into a black watch display.

- [ ] **Step 2: Validate the SVG structure**

Run:

```bash
xmllint --noout assets/app-icon/source/AllyClock-AppIcon-Watch.svg
```

Expected: exit code 0 with no output.

### Task 3: Create the layered tvOS vector sources

**Files:**
- Create: `assets/app-icon/source/AllyClock-AppIcon-tvOS-Background.svg`
- Create: `assets/app-icon/source/AllyClock-AppIcon-tvOS-Foreground.svg`

- [ ] **Step 1: Create the 800×480 background layer**

Use a full-bleed 800×480 rectangle with the approved `#416F76` to `#244D56` diagonal teal gradient. Include no clock geometry in this layer.

- [ ] **Step 2: Create the transparent foreground layer**

Use an 800×480 transparent canvas. Center the clock at `(400, 232)` with an outer diameter of 350 px, leaving generous focus-motion safe space. Preserve the square-master proportions, colors, indices, hands, and shallow shadow.

- [ ] **Step 3: Validate both SVG layers**

Run:

```bash
xmllint --noout assets/app-icon/source/AllyClock-AppIcon-tvOS-Background.svg
xmllint --noout assets/app-icon/source/AllyClock-AppIcon-tvOS-Foreground.svg
```

Expected: both commands exit 0 with no output.

### Task 4: Render and verify PNG exports

**Files:**
- Create: `assets/app-icon/png/ios/AllyClock-AppIcon-1024.png`
- Create: `assets/app-icon/png/watchos/AllyClock-AppIcon-1088.png`
- Create: `assets/app-icon/png/tvos/AllyClock-AppIcon-Background-800x480.png`
- Create: `assets/app-icon/png/tvos/AllyClock-AppIcon-Foreground-800x480.png`
- Create: `assets/app-icon/png/tvos/AllyClock-AppIcon-Flattened-800x480.png`

- [ ] **Step 1: Render each platform asset at its native canvas size**

Run:

```bash
/Users/kevinlee/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 assets/app-icon/render_pngs.py
```

The renderer uses the SVG's coordinates and palette, draws at 4× scale, downsamples with Lanczos antialiasing, keeps the tvOS foreground transparent, and writes opaque full-bleed platform PNGs.

- [ ] **Step 2: Build the tvOS flattened reference**

The same `render_pngs.py` invocation composites the transparent foreground over the background and writes the opaque flattened preview without resizing either layer.

- [ ] **Step 3: Verify dimensions and alpha**

Run:

```bash
sips -g pixelWidth -g pixelHeight -g hasAlpha assets/app-icon/png/ios/AllyClock-AppIcon-1024.png
sips -g pixelWidth -g pixelHeight -g hasAlpha assets/app-icon/png/watchos/AllyClock-AppIcon-1088.png
sips -g pixelWidth -g pixelHeight -g hasAlpha assets/app-icon/png/tvos/AllyClock-AppIcon-Background-800x480.png
sips -g pixelWidth -g pixelHeight -g hasAlpha assets/app-icon/png/tvos/AllyClock-AppIcon-Foreground-800x480.png
sips -g pixelWidth -g pixelHeight -g hasAlpha assets/app-icon/png/tvos/AllyClock-AppIcon-Flattened-800x480.png
```

Expected: iOS is 1024×1024 and opaque; watchOS is 1088×1088 and opaque; each tvOS file is 800×480; only the tvOS foreground requires alpha.

### Task 5: Document the portable icon pack

**Files:**
- Create: `assets/app-icon/README.md`

- [ ] **Step 1: Document asset mapping**

Explain which PNG goes into each Xcode platform icon well, that tvOS requires at least two image-stack layers, that the flattened tvOS PNG is preview-only, and that the SVGs are the editable sources.

- [ ] **Step 2: Document design invariants**

Record the 77% square clock ratio, fixed teal gradient, ivory dial, thin warm-metal keyline, 10:08 hands, and coral seconds accent. Explicitly prohibit baked iOS/watchOS masks and stretched square artwork on tvOS.

- [ ] **Step 3: Inspect the complete pack**

Run:

```bash
find assets/app-icon -type f | sort
```

Expected: four SVG sources, five PNG exports, one renderer, and one README.

- [ ] **Step 4: Commit the asset pack**

```bash
git add assets/app-icon docs/superpowers/plans/2026-07-02-allyclock-app-icon-assets.md
git commit -m "feat: add AllyClock Apple platform icon assets"
```
