# AllyClock Modern Web Favicons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and integrate a complete modern Web favicon set from the approved deterministic AllyClock app icon.

**Architecture:** A focused Python/Pillow renderer will read the committed 1024-pixel iOS icon and write every browser asset plus the Web manifest into Angular's `public` directory. A focused unittest module will validate rendering, failure behavior, determinism, and HTML integration; Angular's production build will prove the static assets are published.

**Tech Stack:** Python 3, Pillow, `unittest`, Angular 21 static assets, HTML, JSON

---

## File Structure

- Create `assets/app-icon/render_web_favicons.py`: deterministic renderer and manifest writer.
- Create `assets/app-icon/test_web_favicons.py`: renderer and HTML integration tests.
- Modify `assets/app-icon/README.md`: document Web outputs and the reproduction command.
- Modify `apps/web/src/index.html`: declare the complete favicon set, manifest, and theme color.
- Create or replace generated files under `apps/web/public`: browser favicon PNGs, Apple touch icon, ICO, Web-app icons, and manifest.

### Task 1: Test and Implement the Deterministic Web Renderer

**Files:**
- Create: `assets/app-icon/test_web_favicons.py`
- Create: `assets/app-icon/render_web_favicons.py`

- [ ] **Step 1: Write failing renderer tests**

Create `assets/app-icon/test_web_favicons.py` with tests that construct a temporary 1024-pixel source image, invoke `render_web_assets`, and verify the complete output contract:

```python
from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from render_web_favicons import render_web_assets


class WebFaviconRendererTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        self.source = self.root / 'source.png'
        self.output = self.root / 'public'
        Image.new('RGB', (1024, 1024), '#294f58').save(self.source)

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def test_renders_complete_web_icon_set(self) -> None:
        render_web_assets(self.source, self.output)

        expected_pngs = {
            'favicon-16x16.png': (16, 16),
            'favicon-32x32.png': (32, 32),
            'apple-touch-icon.png': (180, 180),
            'icon-192.png': (192, 192),
            'icon-512.png': (512, 512),
        }
        for name, size in expected_pngs.items():
            with self.subTest(name=name), Image.open(self.output / name) as image:
                self.assertEqual(image.size, size)
                self.assertEqual(image.mode, 'RGB')

        with Image.open(self.output / 'favicon.ico') as favicon:
            self.assertEqual(favicon.ico.sizes(), {(16, 16), (32, 32), (48, 48)})

        manifest = json.loads((self.output / 'site.webmanifest').read_text())
        self.assertEqual(manifest['name'], 'AllyClock')
        self.assertEqual(manifest['display'], 'standalone')
        self.assertEqual(
            [icon['sizes'] for icon in manifest['icons']],
            ['192x192', '512x512'],
        )

    def test_rejects_source_with_unexpected_dimensions(self) -> None:
        Image.new('RGB', (512, 512), '#294f58').save(self.source)

        with self.assertRaisesRegex(ValueError, '1024 x 1024'):
            render_web_assets(self.source, self.output)

    def test_reports_missing_source(self) -> None:
        self.source.unlink()

        with self.assertRaisesRegex(FileNotFoundError, 'source.png'):
            render_web_assets(self.source, self.output)

    def test_render_is_byte_deterministic(self) -> None:
        render_web_assets(self.source, self.output)
        first = {
            path.name: hashlib.sha256(path.read_bytes()).hexdigest()
            for path in self.output.iterdir()
        }
        render_web_assets(self.source, self.output)
        second = {
            path.name: hashlib.sha256(path.read_bytes()).hexdigest()
            for path in self.output.iterdir()
        }

        self.assertEqual(second, first)


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
cd assets/app-icon
/Users/kevinlee/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest test_web_favicons.py -v
```

Expected: FAIL because `render_web_favicons` does not exist.

- [ ] **Step 3: Implement the renderer**

Create `assets/app-icon/render_web_favicons.py`:

```python
#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/app-icon/png/ios/AllyClock-AppIcon-1024.png'
OUTPUT = ROOT / 'apps/web/public'
PNG_SIZES = {
    'favicon-16x16.png': (16, 16),
    'favicon-32x32.png': (32, 32),
    'apple-touch-icon.png': (180, 180),
    'icon-192.png': (192, 192),
    'icon-512.png': (512, 512),
}
MANIFEST = {
    'name': 'AllyClock',
    'short_name': 'AllyClock',
    'icons': [
        {'src': '/icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
        {'src': '/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
    ],
    'theme_color': '#294f58',
    'background_color': '#294f58',
    'display': 'standalone',
}


def render_web_assets(source_path: Path, output_path: Path) -> None:
    with Image.open(source_path) as opened_source:
        if opened_source.size != (1024, 1024):
            raise ValueError('Web favicon source must be 1024 x 1024 pixels')
        source = opened_source.convert('RGB')

    output_path.mkdir(parents=True, exist_ok=True)
    for name, size in PNG_SIZES.items():
        source.resize(size, Image.Resampling.LANCZOS).save(
            output_path / name,
            format='PNG',
            optimize=False,
            compress_level=9,
        )

    source.save(
        output_path / 'favicon.ico',
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    (output_path / 'site.webmanifest').write_text(
        json.dumps(MANIFEST, indent=2) + '\n',
        encoding='utf-8',
    )


if __name__ == '__main__':
    render_web_assets(SOURCE, OUTPUT)
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run the unittest command from Step 2.

Expected: 4 tests pass.

- [ ] **Step 5: Commit the renderer and tests**

```bash
git add assets/app-icon/render_web_favicons.py assets/app-icon/test_web_favicons.py
git commit -m 'test: define deterministic web favicon rendering'
```

### Task 2: Integrate the Modern Favicon Metadata

**Files:**
- Modify: `assets/app-icon/test_web_favicons.py`
- Modify: `apps/web/src/index.html`

- [ ] **Step 1: Add a failing HTML integration test**

Add this test class to `assets/app-icon/test_web_favicons.py`, above the `if __name__ == '__main__'` block:

```python
class WebFaviconHtmlTests(unittest.TestCase):
    def test_index_declares_complete_favicon_set(self) -> None:
        index = (Path(__file__).resolve().parents[2] / 'apps/web/src/index.html').read_text()

        expected_tags = [
            '<link rel="icon" href="favicon.ico" sizes="any" />',
            '<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png" />',
            '<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png" />',
            '<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png" />',
            '<link rel="manifest" href="site.webmanifest" />',
            '<meta name="theme-color" content="#294f58" />',
        ]
        for tag in expected_tags:
            with self.subTest(tag=tag):
                self.assertIn(tag, index)
```

- [ ] **Step 2: Run the HTML test and verify RED**

Run:

```bash
cd assets/app-icon
/Users/kevinlee/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest test_web_favicons.WebFaviconHtmlTests -v
```

Expected: FAIL because `index.html` does not yet contain the modern declarations.

- [ ] **Step 3: Replace the existing icon declarations**

In `apps/web/src/index.html`, replace the existing three icon links with:

```html
    <meta name="theme-color" content="#294f58" />
    <link rel="icon" href="favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png" />
    <link rel="manifest" href="site.webmanifest" />
```

- [ ] **Step 4: Run the full focused test module and verify GREEN**

Run:

```bash
cd assets/app-icon
/Users/kevinlee/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest test_web_favicons.py -v
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit HTML integration**

```bash
git add assets/app-icon/test_web_favicons.py apps/web/src/index.html
git commit -m 'feat(web): declare modern favicon metadata'
```

### Task 3: Generate, Document, and Verify Published Assets

**Files:**
- Modify: `assets/app-icon/README.md`
- Create or replace: `apps/web/public/favicon.ico`
- Create: `apps/web/public/favicon-16x16.png`
- Create: `apps/web/public/favicon-32x32.png`
- Replace: `apps/web/public/apple-touch-icon.png`
- Create: `apps/web/public/icon-192.png`
- Replace: `apps/web/public/icon-512.png`
- Create: `apps/web/public/site.webmanifest`

- [ ] **Step 1: Generate the committed Web assets**

Run:

```bash
/Users/kevinlee/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 assets/app-icon/render_web_favicons.py
```

Expected: the seven declared files exist in `apps/web/public`; `apps/web/public/icon-v2.png` remains unchanged and untracked.

- [ ] **Step 2: Document reproduction**

Append a `Web favicons` subsection to `assets/app-icon/README.md` listing the generated files and this command:

```bash
/Users/kevinlee/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 assets/app-icon/render_web_favicons.py
```

State that `assets/app-icon/png/ios/AllyClock-AppIcon-1024.png` is the canonical source and the outputs are copied by Angular from `apps/web/public`.

- [ ] **Step 3: Prove deterministic regeneration**

Capture the generated hashes, rerun the renderer, and compare the hashes:

```bash
shasum -a 256 apps/web/public/favicon.ico apps/web/public/favicon-16x16.png apps/web/public/favicon-32x32.png apps/web/public/apple-touch-icon.png apps/web/public/icon-192.png apps/web/public/icon-512.png apps/web/public/site.webmanifest > /tmp/allyclock-web-icons-before.sha256
/Users/kevinlee/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 assets/app-icon/render_web_favicons.py
shasum -a 256 apps/web/public/favicon.ico apps/web/public/favicon-16x16.png apps/web/public/favicon-32x32.png apps/web/public/apple-touch-icon.png apps/web/public/icon-192.png apps/web/public/icon-512.png apps/web/public/site.webmanifest > /tmp/allyclock-web-icons-after.sha256
diff -u /tmp/allyclock-web-icons-before.sha256 /tmp/allyclock-web-icons-after.sha256
```

Expected: `diff` exits 0 with no output.

- [ ] **Step 4: Run all focused favicon tests**

Run:

```bash
cd assets/app-icon
/Users/kevinlee/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest test_web_favicons.py -v
```

Expected: 5 tests pass.

- [ ] **Step 5: Run the production Web build**

Run:

```bash
npm run build:web
```

Expected: exit code 0 and generated favicon files present in `apps/web/dist/allyclock/browser`.

- [ ] **Step 6: Verify built publication**

Run:

```bash
test -f apps/web/dist/allyclock/browser/favicon.ico
test -f apps/web/dist/allyclock/browser/favicon-16x16.png
test -f apps/web/dist/allyclock/browser/favicon-32x32.png
test -f apps/web/dist/allyclock/browser/apple-touch-icon.png
test -f apps/web/dist/allyclock/browser/icon-192.png
test -f apps/web/dist/allyclock/browser/icon-512.png
test -f apps/web/dist/allyclock/browser/site.webmanifest
rg 'favicon-32x32.png|site.webmanifest|theme-color' apps/web/dist/allyclock/browser/index.html
```

Expected: every `test` succeeds and `rg` prints all three declarations.

- [ ] **Step 7: Commit generated outputs and documentation**

```bash
git add assets/app-icon/README.md apps/web/public/favicon.ico apps/web/public/favicon-16x16.png apps/web/public/favicon-32x32.png apps/web/public/apple-touch-icon.png apps/web/public/icon-192.png apps/web/public/icon-512.png apps/web/public/site.webmanifest
git commit -m 'feat(web): add AllyClock favicon asset set'
```

- [ ] **Step 8: Confirm unrelated changes remain untouched**

Run:

```bash
git status --short
```

Expected: the user's pre-existing Web edits and untracked `apps/web/public/icon-v2.png` remain in place; no favicon implementation files remain uncommitted.
