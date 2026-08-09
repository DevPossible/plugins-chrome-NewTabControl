#!/usr/bin/env python3
"""Render the Chrome Web Store promotional tiles.

Store assets are branding, not screenshots - screenshots must be captured from
the running extension. Output goes to .aitemp/ because these are upload
artifacts, not part of the shipped package.

    python scripts/make-promo.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BG = (13, 17, 23, 255)
ACCENT = (71, 178, 228, 255)
MUTED = (154, 167, 180, 255)
FG = (230, 237, 243, 255)

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / ".aitemp" / "store-assets"

FONT_CANDIDATES = [
    "C:/Windows/Fonts/segoeuisl.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
BOLD_CANDIDATES = [
    "C:/Windows/Fonts/segoeuib.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def load_font(candidates, size):
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size)


def draw_mark(draw, x, y, box):
    """The same 2x2 grid as the extension icon, drawn at an arbitrary size."""
    draw.rounded_rectangle([x, y, x + box, y + box], radius=box * 0.22, fill=(22, 27, 34, 255))
    pad = box * 0.20
    inner = box - 2 * pad
    gap = box * 0.055
    cell = (inner - gap) / 2

    for row in range(2):
        for col in range(2):
            cx = x + pad + col * (cell + gap)
            cy = y + pad + row * (cell + gap)
            active = row == 0 and col == 0
            draw.rounded_rectangle(
                [cx, cy, cx + cell, cy + cell],
                radius=cell * 0.16,
                fill=ACCENT if active else None,
                outline=None if active else MUTED,
                width=max(1, int(box * 0.022)),
            )


def fit_font(draw, text, candidates, max_width, start_size):
    """Shrink until the string fits the available width."""
    size = start_size
    while size > 8:
        font = load_font(candidates, size)
        if draw.textlength(text, font=font) <= max_width:
            return font
        size -= 1
    return load_font(candidates, 8)


def tile(width, height, scale):
    img = Image.new("RGBA", (width, height), BG)
    draw = ImageDraw.Draw(img)

    box = int(height * 0.40)
    mark_x = int(width * 0.06)
    mark_y = (height - box) // 2
    draw_mark(draw, mark_x, mark_y, box)

    text_x = mark_x + box + int(width * 0.05)
    avail = width - text_x - int(width * 0.05)

    title = "New Tab Control"
    lines = ["Your new tab, your page.", "One permission. No tracking."]

    title_font = fit_font(draw, title, BOLD_CANDIDATES, avail, int(36 * scale))
    sub_size = max(9, int(title_font.size * 0.46))
    sub_font = fit_font(draw, max(lines, key=len), FONT_CANDIDATES, avail, sub_size)

    gap = int(sub_font.size * 0.55)
    block = title_font.size + gap + sub_font.size * 2 + int(sub_font.size * 0.35)
    y = (height - block) / 2

    draw.text((text_x, y), title, font=title_font, fill=FG)
    y += title_font.size + gap
    draw.text((text_x, y), lines[0], font=sub_font, fill=ACCENT)
    y += sub_font.size * 1.35
    draw.text((text_x, y), lines[1], font=sub_font, fill=MUTED)

    return img.convert("RGB")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, (w, h, scale) in {
        "promo-small-440x280": (440, 280, 1.0),
        "promo-marquee-1400x560": (1400, 560, 2.4),
    }.items():
        path = OUT_DIR / f"{name}.png"
        tile(w, h, scale).save(path, "PNG", optimize=True)
        print(f"wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
