"""Cut an icon sheet (icons in a grid on a white background) into separate
transparent 256px WebP icons for apps/web/public/icons/.

Usage:
  python tools/cut-icons.py SHEET.png COLS ROWS name1,name2,... [--strict name,name]

  SHEET        the generated sheet (PNG/JPG), icons laid out row by row
  COLS ROWS    grid size, e.g. 4 4
  names        file names (without .webp), left to right, top to bottom
  --strict     icons with large near-white parts touching their edge (open
               book, snowy mountain, eyes): use a stricter background cut

Then add each icon to ICONS in apps/web/src/components/Emoji.tsx.
Needs: pip install pillow numpy
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "apps", "web", "public", "icons")
SIZE = 256


def cut(cell: np.ndarray, strict: bool) -> Image.Image:
    rgb = cell.astype(np.int16)
    mn, mx = rgb.min(axis=2), rgb.max(axis=2)
    # near-white = background candidate
    near_white = (mn >= 251) & (mx - mn <= 4) if strict else (mn >= 236) & (mx - mn <= 14)
    # background = near-white pixels connected to the border (keeps white parts inside the icon)
    pad = np.pad(near_white, 2, constant_values=True).astype(np.uint8) * 255
    m = Image.fromarray(pad).copy()  # copy: fromarray shares a read-only buffer
    ImageDraw.floodfill(m, (0, 0), 128)
    bg = (np.array(m) == 128)[2:-2, 2:-2]
    fg = Image.fromarray((~bg).astype(np.uint8) * 255)
    fg = fg.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))  # drop JPEG specks
    alpha = np.array(fg.filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255
    # un-mix the white background from soft edges (no white halo on dark themes)
    a = np.clip(alpha, 1e-3, 1)[..., None]
    col = np.clip((cell.astype(np.float32) - 255 * (1 - a)) / a, 0, 255)
    rgba = np.dstack([col, alpha * 255]).astype(np.uint8)
    ys, xs = np.where(alpha > 0.05)
    im = Image.fromarray(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1], "RGBA")
    side = int(max(im.size) * 1.06)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    return sq.resize((SIZE, SIZE), Image.LANCZOS)


def main(argv: list[str]) -> None:
    if len(argv) < 5:
        sys.exit(__doc__)
    sheet, cols, rows, names = argv[1], int(argv[2]), int(argv[3]), argv[4].split(",")
    strict = set(argv[argv.index("--strict") + 1].split(",")) if "--strict" in argv else set()
    if len(names) > cols * rows:
        sys.exit(f"{len(names)} names for a {cols}x{rows} grid")
    arr = np.array(Image.open(sheet).convert("RGB"))
    h, w = arr.shape[:2]
    os.makedirs(OUT, exist_ok=True)
    for i, name in enumerate(names):
        r, c = divmod(i, cols)
        cell = arr[r * h // rows:(r + 1) * h // rows, c * w // cols:(c + 1) * w // cols]
        path = os.path.join(OUT, name.strip() + ".webp")
        cut(cell, name.strip() in strict).save(path, "WEBP", quality=88, method=6)
        print("ok", os.path.relpath(path))


if __name__ == "__main__":
    main(sys.argv)
