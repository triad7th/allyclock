#!/usr/bin/env python3
"""Render AllyClock PNG assets from the approved vector geometry."""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent
SCALE = 4

TEAL_LIGHT = (65, 111, 118)
TEAL_DARK = (36, 77, 86)
SHADOW = (23, 52, 58, 115)
BODY = (16, 23, 26, 255)
DIAL = (245, 240, 229, 255)
BRASS = (181, 138, 78, 255)
HANDS = (34, 38, 42, 255)
MINOR = (126, 123, 116, 255)
CORAL = (200, 95, 80, 255)


def diagonal_gradient(width: int, height: int) -> Image.Image:
    x = np.linspace(0.0, 1.0, width, dtype=np.float32)
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)
    mix = (x[None, :] + y[:, None]) * 0.5
    start = np.array(TEAL_LIGHT, dtype=np.float32)
    end = np.array(TEAL_DARK, dtype=np.float32)
    rgb = start[None, None, :] * (1.0 - mix[:, :, None]) + end[None, None, :] * mix[:, :, None]
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB").convert("RGBA")


def scaled(value: float, factor: float) -> int:
    return round(value * factor * SCALE)


def point(x: float, y: float, factor: float, origin_x: float, origin_y: float) -> tuple[int, int]:
    return scaled(origin_x + (x - 512) * factor, 1.0), scaled(origin_y + (y - 495) * factor, 1.0)


def round_line(
    draw: ImageDraw.ImageDraw,
    start: tuple[int, int],
    end: tuple[int, int],
    color: tuple[int, int, int, int],
    width: int,
) -> None:
    draw.line((start, end), fill=color, width=width)
    radius = width // 2
    for x, y in (start, end):
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color)


def draw_clock(image: Image.Image, origin_x: float, origin_y: float, factor: float) -> None:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    cx = scaled(origin_x, 1.0)
    cy = scaled(origin_y, 1.0)
    radius = scaled(394, factor)
    shadow_y = scaled(origin_y + 25 * factor, 1.0)
    draw.ellipse((cx - radius, shadow_y - radius, cx + radius, shadow_y + radius), fill=SHADOW)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=BODY)

    dial_radius = scaled(353, factor)
    brass_width = scaled(21, factor)
    draw.ellipse(
        (cx - dial_radius, cy - dial_radius, cx + dial_radius, cy + dial_radius),
        fill=DIAL,
        outline=BRASS,
        width=brass_width,
    )

    cardinal_width = scaled(28, factor)
    for start, end in (
        ((512, 190), (512, 255)),
        ((817, 495), (752, 495)),
        ((512, 800), (512, 735)),
        ((207, 495), (272, 495)),
    ):
        round_line(
            draw,
            point(*start, factor, origin_x, origin_y),
            point(*end, factor, origin_x, origin_y),
            HANDS,
            cardinal_width,
        )

    minor_width = scaled(13, factor)
    for degrees in (30, 60, 120, 210, 240, 300, 330):
        radians = math.radians(degrees)
        start_radius = 311
        end_radius = 269
        start = (512 + math.sin(radians) * start_radius, 495 - math.cos(radians) * start_radius)
        end = (512 + math.sin(radians) * end_radius, 495 - math.cos(radians) * end_radius)
        round_line(
            draw,
            point(*start, factor, origin_x, origin_y),
            point(*end, factor, origin_x, origin_y),
            MINOR,
            minor_width,
        )

    round_line(
        draw,
        point(512, 495, factor, origin_x, origin_y),
        point(387, 376, factor, origin_x, origin_y),
        HANDS,
        scaled(48, factor),
    )
    round_line(
        draw,
        point(512, 495, factor, origin_x, origin_y),
        point(681, 354, factor, origin_x, origin_y),
        HANDS,
        scaled(40, factor),
    )
    round_line(
        draw,
        point(512, 495, factor, origin_x, origin_y),
        point(691, 716, factor, origin_x, origin_y),
        CORAL,
        scaled(14, factor),
    )

    hub_radius = scaled(42, factor)
    hub_outline = scaled(14, factor)
    draw.ellipse(
        (cx - hub_radius, cy - hub_radius, cx + hub_radius, cy + hub_radius),
        fill=CORAL,
        outline=HANDS,
        width=hub_outline,
    )
    image.alpha_composite(layer)


def downsample(image: Image.Image, size: tuple[int, int], opaque: bool) -> Image.Image:
    result = image.resize(size, Image.Resampling.LANCZOS)
    return result.convert("RGB") if opaque else result


def render_square(size: int, path: Path) -> None:
    canvas = diagonal_gradient(size * SCALE, size * SCALE)
    factor = size / 1024
    draw_clock(canvas, size * 0.5, size * (495 / 1024), factor)
    downsample(canvas, (size, size), opaque=True).save(path, format="PNG")


def render_tvos() -> None:
    width, height = 800, 480
    background_large = diagonal_gradient(width * SCALE, height * SCALE)
    background = downsample(background_large, (width, height), opaque=True)

    foreground_large = Image.new("RGBA", (width * SCALE, height * SCALE), (0, 0, 0, 0))
    draw_clock(foreground_large, 400, 232, 350 / 788)
    foreground = downsample(foreground_large, (width, height), opaque=False)

    tvos_dir = ROOT / "png" / "tvos"
    background.save(tvos_dir / "AllyClock-AppIcon-Background-800x480.png", format="PNG")
    foreground.save(tvos_dir / "AllyClock-AppIcon-Foreground-800x480.png", format="PNG")
    Image.alpha_composite(background.convert("RGBA"), foreground).convert("RGB").save(
        tvos_dir / "AllyClock-AppIcon-Flattened-800x480.png", format="PNG"
    )


def main() -> None:
    (ROOT / "png" / "ios").mkdir(parents=True, exist_ok=True)
    (ROOT / "png" / "watchos").mkdir(parents=True, exist_ok=True)
    (ROOT / "png" / "tvos").mkdir(parents=True, exist_ok=True)
    render_square(1024, ROOT / "png" / "ios" / "AllyClock-AppIcon-1024.png")
    render_square(1088, ROOT / "png" / "watchos" / "AllyClock-AppIcon-1088.png")
    render_tvos()


if __name__ == "__main__":
    main()
