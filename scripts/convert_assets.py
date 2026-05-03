#!/usr/bin/env python3
"""Convert HEIC body images to JPG for browser consumption.

Browsers can't render HEIC in <canvas>, so we transcode to JPEG (q=92) at
the source orientation. Outputs sit alongside the originals with .jpg suffix
and lowercase basenames so paths stay simple in the engine.
"""
import sys
from pathlib import Path
from pillow_heif import register_heif_opener
register_heif_opener()
from PIL import Image, ImageOps

src = Path("luxuryimages/BodyDemo")
out = Path("luxuryimages/converted")
out.mkdir(parents=True, exist_ok=True)

count = 0
for p in sorted(src.iterdir()):
    if p.suffix.upper() not in {".HEIC", ".JPG", ".JPEG", ".PNG"}:
        continue
    target = out / (p.stem.lower() + ".jpg")
    img = Image.open(p)
    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        img = img.convert("RGB")
    # Cap longest side at 2000px to keep file size manageable
    long_side = max(img.size)
    if long_side > 2000:
        scale = 2000 / long_side
        img = img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)
    img.save(target, "JPEG", quality=92, optimize=True)
    print(f"{p.name} -> {target.name}  {img.size}")
    count += 1

# Also normalize product PNGs (just lowercase the names; preserve alpha)
prod_src = Path("luxuryimages/Product demo")
prod_out = Path("luxuryimages/products_normalized")
prod_out.mkdir(parents=True, exist_ok=True)
for p in sorted(prod_src.iterdir()):
    if p.suffix.lower() != ".png":
        continue
    target = prod_out / p.name.lower()
    img = Image.open(p)
    if img.mode not in ("RGBA", "LA"):
        img = img.convert("RGBA")
    img.save(target, "PNG", optimize=True)
    print(f"{p.name} -> {target.name}  {img.size} mode={img.mode}")
    count += 1

print(f"converted: {count}")
