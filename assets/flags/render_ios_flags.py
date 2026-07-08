#!/usr/bin/env python3
"""Rasterize the web's flag-icons SVGs into the iOS asset catalog.

The web renders square country flags from the `flag-icons` npm package
(`flags/1x1/<code>.svg`, copied by angular.json). iOS renders the SAME
artwork: this script rasterizes every 1x1 SVG to a 256px PNG via macOS
QuickLook (`qlmanage`) and writes one imageset per country code into
`Assets.xcassets/Flags` (a namespaced folder, so images resolve as
"Flags/<code>").

Rerun after `npm --prefix apps/web ci` bumps flag-icons:
    python3 assets/flags/render_ios_flags.py

flag-icons is MIT licensed (https://github.com/lipis/flag-icons).
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SVG_DIR = ROOT / "apps/web/node_modules/flag-icons/flags/1x1"
CATALOG_DIR = ROOT / "apps/ios/AllyClock/Assets.xcassets/Flags"
SIZE = 256

FOLDER_CONTENTS = {
    "info": {"author": "xcode", "version": 1},
    "properties": {"provides-namespace": True},
}


def imageset_contents(png_name: str) -> dict:
    return {
        "images": [{"filename": png_name, "idiom": "universal"}],
        "info": {"author": "xcode", "version": 1},
        # Single-scale: the source is vector-rendered at 256px, far above
        # the on-face display size.
        "properties": {"preserves-vector-representation": False},
    }


def main() -> int:
    svgs = sorted(SVG_DIR.glob("*.svg"))
    if not svgs:
        print(f"no SVGs found at {SVG_DIR} — run `npm --prefix apps/web ci` first")
        return 1

    if CATALOG_DIR.exists():
        shutil.rmtree(CATALOG_DIR)
    CATALOG_DIR.mkdir(parents=True)
    (CATALOG_DIR / "Contents.json").write_text(json.dumps(FOLDER_CONTENTS, indent=2) + "\n")

    with tempfile.TemporaryDirectory() as tmp:
        # qlmanage renders <name>.svg -> <name>.svg.png at max dimension SIZE.
        subprocess.run(
            ["qlmanage", "-t", "-s", str(SIZE), "-o", tmp, *map(str, svgs)],
            check=True,
            capture_output=True,
        )
        rendered = {p.name: p for p in Path(tmp).glob("*.svg.png")}
        missing = [s.name for s in svgs if f"{s.name}.png" not in rendered]
        if missing:
            print(f"qlmanage failed to render {len(missing)} flags: {missing[:10]}")
            return 1

        for svg in svgs:
            code = svg.stem  # e.g. "us", "kr", "gb-eng"
            image_dir = CATALOG_DIR / f"{code}.imageset"
            image_dir.mkdir()
            png_name = f"{code}.png"
            shutil.copyfile(rendered[f"{svg.name}.png"], image_dir / png_name)
            (image_dir / "Contents.json").write_text(
                json.dumps(imageset_contents(png_name), indent=2) + "\n"
            )

    print(f"wrote {len(svgs)} flag imagesets to {CATALOG_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
