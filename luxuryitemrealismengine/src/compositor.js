// Render pipeline (deterministic, no AI):
//
//   photo
//     → cast shadow      (soft, far)
//     → contact shadow   (sharp, at touch)
//     → product layer    (with edge feather + ambient color match)
//     → occlusion mask   (photo pixels overlaid where the body covers product)

import { pixelsPerMm, productPixelSize, composeMatrix, drawWithMatrix } from "./transform.js";
import { drawContactShadow, drawCastShadow } from "./shadow.js";
import { sampleAverageColor, applyAmbientTint, featherEdges } from "./lighting.js";
import { loadProductImage } from "./assetLoader.js";
import { OcclusionLayer } from "./occlusion.js";
import { visualSizeMm } from "./productProfile.js";

export class Compositor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.photo = null;
    this.photoCanvas = null;
    this.profile = null;
    this.productImage = null;
    this.assetSource = null;
    this.assetWarning = null;
    this.preparedImage = null;
    this.lastPrepKey = null;
    this.occlusion = new OcclusionLayer();
  }

  async setPhoto(image) {
    this.photo = image;
    const w = image.naturalWidth || image.width;
    const h = image.naturalHeight || image.height;
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    this.canvas.width = Math.round(w * scale);
    this.canvas.height = Math.round(h * scale);
    const off = document.createElement("canvas");
    off.width = this.canvas.width;
    off.height = this.canvas.height;
    off.getContext("2d", { willReadFrequently: true }).drawImage(image, 0, 0, off.width, off.height);
    this.photoCanvas = off;
    this.occlusion.resize(this.canvas.width, this.canvas.height);
    this.occlusion.clear();
  }

  async setProduct(profile) {
    this.profile = profile;
    const { image, source, warning } = await loadProductImage(profile);
    this.productImage = image;
    this.assetSource = source;
    this.assetWarning = warning || null;
    this.preparedImage = image;
    this.lastPrepKey = null;
    return { source, warning };
  }

  prepareProduct({ featherPx, ambientStrength, anchors }) {
    if (!this.productImage) return;
    const sceneTone = ambientStrength > 0 && anchors && this.photoCanvas
      ? sampleAverageColor(
          this.photoCanvas,
          (anchors[0].x + anchors[1].x) / 2,
          (anchors[0].y + anchors[1].y) / 2,
          60,
        )
      : null;
    const key = `${featherPx}|${ambientStrength}|${sceneTone ? `${sceneTone.r},${sceneTone.g},${sceneTone.b}` : "none"}`;
    if (key === this.lastPrepKey) return;
    let img = featherPx > 0 ? featherEdges(this.productImage, featherPx) : this.productImage;
    if (sceneTone && ambientStrength > 0) {
      const tinted = document.createElement("canvas");
      tinted.width = img.width;
      tinted.height = img.height;
      const tctx = tinted.getContext("2d");
      tctx.drawImage(img, 0, 0);
      applyAmbientTint(tctx, sceneTone, ambientStrength);
      img = tinted;
    }
    this.preparedImage = img;
    this.lastPrepKey = key;
  }

  // Helper: estimate skin tone for auto-occlusion. Strategy by anchor shape:
  //   - SHORT anchor (watch / bracelet / ring across a body part): both
  //     endpoints are on skin; sample perpendicular to the line so we land
  //     beyond any tiny product overlap.
  //   - LONG anchor (handbag: hand → bag bottom): only anchor[0] is on the
  //     body. Sample at anchor[0] with a small radius.
  // Heuristic: if anchor length > 1.5× the product's expected pixel width,
  // treat it as a "long" hand-to-bag anchor.
  sceneSkinTone(anchors) {
    if (!anchors || !this.photoCanvas) return null;
    const dx = anchors[1].x - anchors[0].x;
    const dy = anchors[1].y - anchors[0].y;
    const len = Math.hypot(dx, dy) || 1;
    const productWidthPx = this.profile?.dimensions?.visualWidthMm
      ? this.profile.dimensions.visualWidthMm * (len / (this.profile.refMm || 55))
      : len;
    const isLongAnchor = len > productWidthPx * 1.5;
    const W = this.photoCanvas.width;
    const H = this.photoCanvas.height;
    const clamp = (x, y) => ({
      x: Math.min(W - 50, Math.max(50, x)),
      y: Math.min(H - 50, Math.max(50, y)),
    });
    if (isLongAnchor) {
      // Sample at the body-side endpoint (anchor[0]), pulled slightly back
      // along the line away from the product.
      const ux = dx / len, uy = dy / len;
      const back = -len * 0.05;
      const p = clamp(anchors[0].x + ux * back, anchors[0].y + uy * back);
      return sampleAverageColor(this.photoCanvas, p.x, p.y, 40);
    }
    // Short anchor → perpendicular offset of ~0.6× span, clamped to image.
    const cx = (anchors[0].x + anchors[1].x) / 2;
    const cy = (anchors[0].y + anchors[1].y) / 2;
    const px = -dy / len, py = dx / len;
    const offset = len * 0.6;
    const p1 = clamp(cx + px * offset, cy + py * offset);
    const p2 = clamp(cx - px * offset, cy - py * offset);
    const c1 = sampleAverageColor(this.photoCanvas, p1.x, p1.y, 40);
    const c2 = sampleAverageColor(this.photoCanvas, p2.x, p2.y, 40);
    return {
      r: Math.round((c1.r + c2.r) / 2),
      g: Math.round((c1.g + c2.g) / 2),
      b: Math.round((c1.b + c2.b) / 2),
    };
  }

  render({ anchors, params }) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.photoCanvas) ctx.drawImage(this.photoCanvas, 0, 0);
    if (!anchors || !this.profile || !this.productImage) return;

    this.prepareProduct({
      featherPx: params.featherPx,
      ambientStrength: params.ambientStrength,
      anchors,
    });

    const refMm = params.refMm || this.profile.refMm;
    const ppmm = pixelsPerMm(anchors[0], anchors[1], refMm);
    const visual = visualSizeMm(this.profile);
    // Width is fixed by visualWidthMm × ppmm. Height respects the asset's
    // own aspect ratio so the source image isn't stretched (a bracelet asset
    // photographed laid-flat doesn't get crushed into a thin strip just
    // because catalog height says 16mm).
    const w = visual.widthMm * ppmm * params.scale;
    const assetAspect = (this.productImage.naturalHeight || this.productImage.height) /
                        (this.productImage.naturalWidth || this.productImage.width);
    const width = w;
    const height = w * assetAspect;
    const matrix = composeMatrix({
      anchorA: anchors[0],
      anchorB: anchors[1],
      width,
      height,
      rotationOffsetDeg: params.rotationDeg,
      skewXDeg: params.perspectiveDeg,
      liftPx: params.liftPx,
    });

    if (params.castShadow > 0) {
      drawCastShadow(ctx, this.preparedImage, matrix, {
        opacity: params.castShadow,
        blurPx: params.castShadowBlur,
        distance: params.castShadowDistance,
        angleDeg: params.lightAngleDeg,
      });
    }
    if (params.contactShadow > 0) {
      drawContactShadow(ctx, this.preparedImage, matrix, {
        opacity: params.contactShadow,
        blurPx: params.contactShadowBlur,
        distance: params.contactShadowDistance,
        angleDeg: params.lightAngleDeg,
      });
    }
    drawWithMatrix(ctx, this.preparedImage, matrix, params.productOpacity);

    if (params.occlusionEnabled !== false) {
      this.occlusion.applyTo(ctx, this.photoCanvas);
    }
  }

  // Export the current composite as a PNG data URL. The caller is expected
  // to render a clean composite (no anchor handles) before calling this.
  exportPNG() {
    return this.canvas.toDataURL("image/png");
  }
}
