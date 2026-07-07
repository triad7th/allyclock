import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/app-icon/png/ios/AllyClock-AppIcon-1024.png'
OUTPUT = ROOT / 'apps/web/public'

# Browser-tab favicons crop in on the clock (body circle center 512,495 r 394,
# shadow bottom y 914) so the face stays legible at 16 px. Touch/PWA icons keep
# the full padded art because the OS applies its own mask around it.
TAB_ICON_CROP = (92, 75, 932, 915)

TAB_ICON_SIZES = {
    'favicon-16x16.png': (16, 16),
    'favicon-32x32.png': (32, 32),
}

FULL_ART_SIZES = {
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

    tab_art = image.crop(TAB_ICON_CROP)

    for art, sizes in ((tab_art, TAB_ICON_SIZES), (image, FULL_ART_SIZES)):
        for filename, size in sizes.items():
            resized = art.resize(size, Image.Resampling.LANCZOS)
            resized.save(
                output / filename,
                format='PNG',
                compress_level=9,
                optimize=False,
            )

    favicon = tab_art.resize((48, 48), Image.Resampling.LANCZOS)
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
