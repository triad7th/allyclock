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
        {
            'src': '/icon-192.png',
            'sizes': '192x192',
            'type': 'image/png',
            'purpose': 'any',
        },
        {
            'src': '/icon-512.png',
            'sizes': '512x512',
            'type': 'image/png',
            'purpose': 'any',
        },
    ],
    'theme_color': '#294f58',
    'background_color': '#294f58',
    'display': 'standalone',
}


def render_web_assets(source=SOURCE, output=OUTPUT):
    source = Path(source)
    output = Path(output)

    with Image.open(source) as source_image:
        if source_image.size != (1024, 1024):
            raise ValueError(
                f'Source image must be exactly 1024 x 1024; got '
                f'{source_image.width} x {source_image.height}'
            )
        image = source_image.convert('RGB')

    output.mkdir(parents=True, exist_ok=True)

    for filename, size in PNG_SIZES.items():
        resized = image.resize(size, Image.Resampling.LANCZOS)
        resized.save(
            output / filename,
            format='PNG',
            compress_level=9,
            optimize=False,
        )

    favicon = image.resize((48, 48), Image.Resampling.LANCZOS)
    favicon.save(
        output / 'favicon.ico',
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48)],
    )

    (output / 'site.webmanifest').write_text(
        json.dumps(MANIFEST, indent=2) + '\n',
        encoding='utf-8',
    )


if __name__ == '__main__':
    render_web_assets()
