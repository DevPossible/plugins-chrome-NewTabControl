#!/usr/bin/env python3
"""Render the New Tab Control icon set from a single vector-ish description.

Run this only when the mark changes; the PNGs it produces are committed.
    python scripts/make-icons.py

Two different deliverables come out of the same mark:

* src/icons/icon{16,32,48,128}.png - the manifest icons, where the artwork
  fills the canvas. These are committed and ship in the package.
* .aitemp/store-assets/store-icon-128x128.png - the Chrome Web Store listing
  icon, which has a different spec: 96x96 of artwork inside 16px of
  transparent padding on every side. The store rejects or visually crops
  icons that bleed to the edge, so this cannot just be icon128.png.

The store icon also gets a faint outer glow. Our mark is near-black, and
Google's image guidance calls for a subtle light glow on mostly-dark icons so
they stay visible against the store's dark theme.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

BG = (13, 17, 23, 255)        # #0d1117 - DevPossible dark
ACCENT = (71, 178, 228, 255)  # #47b2e4 - DevPossible accent
MUTED = (94, 110, 128, 255)

SIZES = (16, 32, 48, 128)
SUPERSAMPLE = 8
ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "src" / "icons"
STORE_DIR = ROOT / ".aitemp" / "store-assets"

# Chrome Web Store store-icon geometry.
STORE_CANVAS = 128
STORE_ARTWORK = 96
STORE_PADDING = (STORE_CANVAS - STORE_ARTWORK) // 2  # 16px per side


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


def render_store_icon() -> Image.Image:
    """96x96 of mark, centred in a 128x128 transparent canvas, with a soft glow."""
    canvas = Image.new("RGBA", (STORE_CANVAS, STORE_CANVAS), (0, 0, 0, 0))
    mark = render(STORE_ARTWORK)

    # Glow: the mark's silhouette, blurred and tinted light, sitting behind it.
    # Bounded by the padding so no light bleeds to the canvas edge.
    silhouette = Image.new("L", (STORE_CANVAS, STORE_CANVAS), 0)
    ImageDraw.Draw(silhouette).rounded_rectangle(
        [STORE_PADDING, STORE_PADDING,
         STORE_PADDING + STORE_ARTWORK - 1, STORE_PADDING + STORE_ARTWORK - 1],
        radius=STORE_ARTWORK * 0.22,
        fill=255,
    )
    glow = Image.new("RGBA", (STORE_CANVAS, STORE_CANVAS), (255, 255, 255, 0))
    glow.putalpha(silhouette.filter(ImageFilter.GaussianBlur(4)).point(lambda a: int(a * 0.30)))
    canvas.alpha_composite(glow)

    canvas.alpha_composite(mark, (STORE_PADDING, STORE_PADDING))
    return canvas


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        path = OUT_DIR / f"icon{size}.png"
        render(size).save(path, "PNG", optimize=True)
        print(f"wrote {path.relative_to(ROOT)}")

    STORE_DIR.mkdir(parents=True, exist_ok=True)
    store_path = STORE_DIR / "store-icon-128x128.png"
    render_store_icon().save(store_path, "PNG", optimize=True)
    print(f"wrote {store_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
