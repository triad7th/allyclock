import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from render_web_favicons import render_web_assets


class RenderWebAssetsTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary_directory.cleanup)
        temporary_path = Path(self.temporary_directory.name)
        self.source = temporary_path / 'source.png'
        self.output = temporary_path / 'public'
        Image.new('RGB', (1024, 1024), '#294f58').save(self.source)

    def test_renders_complete_web_asset_set(self):
        render_web_assets(self.source, self.output)

        expected_pngs = {
            'favicon-16x16.png': (16, 16),
            'favicon-32x32.png': (32, 32),
            'apple-touch-icon.png': (180, 180),
            'icon-192.png': (192, 192),
            'icon-512.png': (512, 512),
        }
        for filename, size in expected_pngs.items():
            with Image.open(self.output / filename) as image:
                self.assertEqual(image.size, size)
                self.assertEqual(image.mode, 'RGB')

        with Image.open(self.output / 'favicon.ico') as favicon:
            self.assertEqual(
                favicon.info['sizes'],
                {(16, 16), (32, 32), (48, 48)},
            )

        manifest = json.loads(
            (self.output / 'site.webmanifest').read_text(encoding='utf-8')
        )
        self.assertEqual(manifest['name'], 'AllyClock')
        self.assertEqual(manifest['display'], 'standalone')
        self.assertEqual(
            [icon['sizes'] for icon in manifest['icons']],
            ['192x192', '512x512'],
        )

    def test_rejects_wrong_source_dimensions(self):
        Image.new('RGB', (512, 512), '#294f58').save(self.source)

        with self.assertRaisesRegex(ValueError, '1024 x 1024'):
            render_web_assets(self.source, self.output)

    def test_rejects_missing_source(self):
        missing_source = self.source.with_name('missing-source.png')

        with self.assertRaisesRegex(FileNotFoundError, 'source.png'):
            render_web_assets(missing_source, self.output)

    def test_rendering_is_deterministic(self):
        render_web_assets(self.source, self.output)
        first_hashes = self._hashes()

        render_web_assets(self.source, self.output)

        self.assertEqual(self._hashes(), first_hashes)

    def _hashes(self):
        return {
            path.name: hashlib.sha256(path.read_bytes()).hexdigest()
            for path in sorted(self.output.iterdir())
        }


if __name__ == '__main__':
    unittest.main()
