#!/usr/bin/env python3
"""Render the New Tab Control icon set from a single vector-ish description.

Run this only when the mark changes; the PNGs it produces are committed.
    python scripts/make-icons.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

BG = (13, 17, 23, 255)        # #0d1117 - DevPossible dark
ACCENT = (71, 178, 228, 255)  # #47b2e4 - DevPossible accent
MUTED = (94, 110, 128, 255)

SIZES = (16, 32, 48, 128)
SUPERSAMPLE = 8
OUT_DIR = Path(__file__).resolve().parent.parent / "src" / "icons"


def render(size: int) -> Image.Image:
    """A browser-tab grid with the active pane lit in the accent colour."""
    s = size * SUPERSAMPLE
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    draw.rounded_rectangle([0, 0, s - 1, s - 1], radius=s * 0.22, fill=BG)

    pad = s * 0.20
    inner = s - 2 * pad
    gap = s * 0.055
    cell = (inner - gap) / 2
    radius = max(1, cell * 0.16)

    for row in range(2):
        for col in range(2):
            x0 = pad + col * (cell + gap)
            y0 = pad + row * (cell + gap)
            active = row == 0 and col == 0
            draw.rounded_rectangle(
                [x0, y0, x0 + cell, y0 + cell],
                radius=radius,
                fill=ACCENT if active else None,
                outline=None if active else MUTED,
                width=max(1, int(s * 0.022)),
            )

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        path = OUT_DIR / f"icon{size}.png"
        render(size).save(path, "PNG", optimize=True)
        print(f"wrote {path.relative_to(OUT_DIR.parent.parent)}")


if __name__ == "__main__":
    main()
