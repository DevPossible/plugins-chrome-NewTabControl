#!/usr/bin/env python3
"""Compose a raw UI capture into a 1280x800 Chrome Web Store screenshot.

The store requires exactly 1280x800 (or 640x400). A raw capture almost never
has that aspect ratio, and stretching it distorts the UI - which reviewers
notice and users resent. So the capture is scaled proportionally and placed on
a brand-coloured canvas alongside copy.

The capture itself is never altered beyond proportional scaling. Everything
stated in the copy must be true of the shipped extension.

    python scripts/make-screenshot.py <capture.png> <out-name> [--caption KEY]

Captions are defined in CAPTIONS below.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BG = (13, 17, 23)
PANEL_EDGE = (43, 52, 64)
ACCENT = (71, 178, 228)
MUTED = (154, 167, 180)
FG = (230, 237, 243)

CANVAS = (1280, 800)
ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / ".aitemp" / "store-assets"

FONT_REGULAR = ["C:/Windows/Fonts/segoeui.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
FONT_BOLD = ["C:/Windows/Fonts/segoeuib.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]

CAPTIONS = {
    "settings": {
        "headline": "Your new tab,\nyour page.",
        "sub": "Point it at a dashboard, a wiki, your notes,\nor any http:// or https:// address.",
        "bullets": [
            "One permission: storage",
            "No access to the sites you visit",
            "No analytics, no tracking, no remote code",
            "Open source, built by a public pipeline",
        ],
    },
    "newtab": {
        "headline": "Open to what\nmatters.",
        "sub": "Redirect straight to your page, or embed it\nand keep the address bar ready to type.",
        "bullets": [
            "Works with any site in redirect mode",
            "Tells you plainly when a site refuses framing",
            "Settings sync with your Chrome profile",
        ],
    },
}


def load_font(candidates, size):
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size)


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.width - 1, img.height - 1], radius=radius, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def compose(capture_path, out_name, caption):
    canvas = Image.new("RGB", CANVAS, BG)
    draw = ImageDraw.Draw(canvas)

    shot = Image.open(capture_path).convert("RGB")

    # Proportional scale only - never distort the UI.
    max_h = CANVAS[1] - 120
    max_w = 560
    scale = min(max_h / shot.height, max_w / shot.width)
    shot = shot.resize((round(shot.width * scale), round(shot.height * scale)), Image.LANCZOS)

    shot_x = CANVAS[0] - shot.width - 80
    shot_y = (CANVAS[1] - shot.height) // 2
    canvas.paste(rounded(shot, 12), (shot_x, shot_y), rounded(shot, 12))
    draw.rounded_rectangle(
        [shot_x, shot_y, shot_x + shot.width - 1, shot_y + shot.height - 1],
        radius=12, outline=PANEL_EDGE, width=1,
    )

    head_font = load_font(FONT_BOLD, 52)
    sub_font = load_font(FONT_REGULAR, 22)
    bullet_font = load_font(FONT_REGULAR, 20)

    x = 80
    head_lines = caption["headline"].split("\n")
    sub_lines = caption["sub"].split("\n")

    block = (
        len(head_lines) * 62
        + 26
        + len(sub_lines) * 32
        + 34
        + len(caption["bullets"]) * 38
    )
    y = (CANVAS[1] - block) // 2

    for line in head_lines:
        draw.text((x, y), line, font=head_font, fill=FG)
        y += 62
    y += 26

    for line in sub_lines:
        draw.text((x, y), line, font=sub_font, fill=MUTED)
        y += 32
    y += 34

    for bullet in caption["bullets"]:
        draw.ellipse([x + 3, y + 9, x + 11, y + 17], fill=ACCENT)
        draw.text((x + 26, y), bullet, font=bullet_font, fill=FG)
        y += 38

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"{out_name}.png"
    canvas.save(out_path, "PNG", optimize=True)
    print(f"wrote {out_path.relative_to(ROOT)}  {canvas.size[0]}x{canvas.size[1]}")
    return out_path


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    key = "settings"
    for a in sys.argv[1:]:
        if a.startswith("--caption="):
            key = a.split("=", 1)[1]

    if len(args) < 2:
        print(__doc__)
        raise SystemExit(2)

    compose(args[0], args[1], CAPTIONS[key])


if __name__ == "__main__":
    main()
