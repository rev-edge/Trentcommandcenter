#!/usr/bin/env python3
"""Remove white backgrounds from product PNGs.

The catalog assets ship as RGBA but with a fully opaque alpha channel and a
near-white background. Run rembg (u2net) once at asset prep time so the
engine never sees the white border. Output goes to luxuryimages/products_cut/.
"""
from pathlib import Path
from rembg import remove, new_session
from PIL import Image
import io

src = Path("luxuryimages/products_normalized")
out = Path("luxuryimages/products_cut")
out.mkdir(parents=True, exist_ok=True)

# u2netp is the small / fast model; quality is plenty for catalog shots.
session = new_session("u2netp")

for p in sorted(src.iterdir()):
    if p.suffix.lower() != ".png":
        continue
    target = out / p.name
    img = Image.open(p)
    cut = remove(img, session=session, alpha_matting=True,
                 alpha_matting_foreground_threshold=240,
                 alpha_matting_background_threshold=15,
                 alpha_matting_erode_size=2)
    # Tight-crop to the alpha bounding box so the engine's widthMm scaling is
    # accurate (engine assumes the product fills its image bounds).
    bbox = cut.getbbox()
    if bbox:
        cut = cut.crop(bbox)
    cut.save(target, "PNG", optimize=True)
    print(f"{p.name:20s} -> {target.name}  cut size={cut.size}")
