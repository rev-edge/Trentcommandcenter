# Product raster assets

Drop high-resolution transparent PNG/WebP files here using this path
convention:

```
watches/<id>.png
rings/<id>.png
bracelets/<id>.png
bags/<id>.png
```

The `<id>` must match the product `id` in `src/catalog.js`. The loader
prefers raster files automatically; if a raster is missing, the engine falls
back to the catalog's SVG silhouette and the UI displays a "Placeholder
asset" badge.

## Asset guidelines

- **Background**: pre-removed (transparent alpha channel).
- **Resolution**: at least 2000 px on the longest side; 4000 px preferred for
  watches and bags so dial/strap/leather detail survives scaling.
- **Framing**: tight crop, the product fills the bounding box; centered.
- **Lighting**: neutral, soft, even — the engine layers scene-matched ambient
  tint at render time, so over-lit assets are hard to neutralize.
- **Format**: PNG-24 with alpha is safest; WebP is fine for smaller assets.
- **No watermarks, no shadows baked in** (the engine generates contact and
  ambient shadows from the alpha channel).
