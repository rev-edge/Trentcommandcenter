# Luxury Item Realism Engine

V1 prototype of a deterministic, web-embedded try-on widget for luxury
accessories: watches, rings, bracelets, and handbags.

## Core principle

This is **not** a generative AI image engine. AI is used only for product
preparation — enrichment, segmentation, background removal, image quality
scoring. The final composite is rendered deterministically with real-world
dimensions and 2.5D compositing so logos, dials, stitching, and gemstones are
never hallucinated.

## Realism path vs. fallback path

| Path | Source | When used | Visual quality |
|---|---|---|---|
| **Realism** | High-res transparent PNG/WebP under `assets/products/<category>/<id>.<ext>` | Default, when raster is present | Premium |
| **Fallback** | Inline SVG silhouette in the catalog | Cold-start, debug, calibration | Placeholder — clearly badged |

The widget surfaces an **HD raster · realism mode** badge when raster assets
load, and a **Placeholder asset** badge when the SVG fallback is used.

## Run the prototype

The widget is plain ES modules + canvas — no build step. Serve the directory
and open `index.html`:

```sh
cd luxuryitemrealismengine
python3 -m http.server 5173
# open http://localhost:5173/
```

Drop a photo into the upload zone, pick a category and a product, drag the two
anchor handles, and use the right-side controls to fine-tune.

## Adding real product assets

Drop PNG/WebP files (with transparency, ideally 2k+ on the long side, square
or product-natural aspect) into:

```
assets/products/watches/<id>.png
assets/products/rings/<id>.png
assets/products/bracelets/<id>.png
assets/products/bags/<id>.png
```

The `<id>` matches the product `id` in `src/catalog.js`. The loader will
prefer the raster automatically and the badge will switch to realism mode.

## Architecture

```
src/
  engine.js            public entry (re-exports)
  embed.js             mountLuxuryTryOn(host) — retailer embed path
  ui.js                widget controller (single-screen)
  compositor.js        render pipeline (deterministic, no AI)
  transform.js         scale / rotate / perspective math
  shadow.js            alpha-derived contact + ambient shadows
  lighting.js          scene tone sampling, ambient tint, edge feather
  anchors.js           two-point landmark placement
  assetLoader.js       raster-first loader, SVG fallback
  productProfile.js    ProductProfile schema + helpers
  categoryPresets.js   per-category anchor + render defaults
  catalog.js           sample products as normalized profiles
  ai/hooks.js          enrichment stubs (prep only — never in render)
```

## What V1 does not do

- No marketplace, auth, payments, retailer dashboard, or production SaaS infra.
- No full AR or 3D reconstruction.
- No body-pose estimation in V1 — anchor placement is manual (two handles).
- No AI in the render path.
