# AllyClock Apple Platform Icon Pack

This directory contains deterministic SVG sources and PNG exports of the approved AllyClock app icon. The PNGs are rendered from the SVG files; no generative-image model is used.

`render_pngs.py` reproduces the SVG geometry with the same coordinates and palette at 4× antialiasing, then writes the platform PNG exports.

## Platform Files

### iOS and iPadOS

- Source: `source/AllyClock-AppIcon-Square.svg`
- Import asset: `png/ios/AllyClock-AppIcon-1024.png`
- Canvas: 1024×1024, opaque sRGB
- Import into the universal 1024×1024 AppIcon image well. Do not add a rounded mask; iOS applies it.

### watchOS

- Source: `source/AllyClock-AppIcon-Watch.svg`
- Import asset: `png/watchos/AllyClock-AppIcon-1088.png`
- Canvas: 1088×1088, opaque sRGB
- Import into the watchOS AppIcon image well. Do not add a circular mask; watchOS applies it.

### tvOS

- Back source: `source/AllyClock-AppIcon-tvOS-Background.svg`
- Front source: `source/AllyClock-AppIcon-tvOS-Foreground.svg`
- Back layer: `png/tvos/AllyClock-AppIcon-Background-800x480.png`
- Front layer: `png/tvos/AllyClock-AppIcon-Foreground-800x480.png`
- Preview only: `png/tvos/AllyClock-AppIcon-Flattened-800x480.png`
- Canvas: 800×480

Add the background and foreground PNGs as separate layers in the tvOS App Icon image stack. The flattened file is a visual reference and is not a substitute for the parallax layers.

## Design Invariants

- Deep teal gradient: `#416F76` to `#244D56`
- Clock diameter: 77% of the square canvas
- Near-black body: `#10171A`
- Warm ivory dial: `#F5F0E5`
- Thin warm-metal keyline: `#B58A4E`
- Near-black hands: `#22262A`, set near 10:08
- Coral seconds hand and hub: `#C85F50`
- Flat, shallow depth with no heavy bevel or antique texture

Do not bake platform masks into the source files, stretch the square source into the tvOS rectangle, or replace the layered tvOS files with the flattened preview.
