// Render pipeline: photo -> ambient shadow -> contact shadow -> product layer
// (with edge feather + ambient color match). Fully deterministic; no AI in the
// render path. Raster (PNG/WebP) assets are the realism path; SVG is fallback.

import { pixelsPerMm, productPixelSize, composeMatrix, drawWithMatrix } from "./transform.js";
import { drawContactShadow, drawAmbientShadow } from "./shadow.js";
import { sampleAverageColor, applyAmbientTint, featherEdges } from "./lighting.js";
import { loadProductImage } from "./assetLoader.js";

export class Compositor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.photo = null;
    this.photoCanvas = null;
    this.profile = null;
    this.productImage = null;
    this.assetSource = null;        // 'raster' | 'fallback'
    this.assetWarning = null;
    this.preparedImage = null;
    this.lastPrepKey = null;
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
    off.getContext("2d").drawImage(image, 0, 0, off.width, off.height);
    this.photoCanvas = off;
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
          40,
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
    const { width, height } = productPixelSize(
      { widthMm: this.profile.dimensions.widthMm, heightMm: this.profile.dimensions.heightMm },
      ppmm,
      params.scale,
    );
    const matrix = composeMatrix({
      anchorA: anchors[0],
      anchorB: anchors[1],
      width,
      height,
      rotationOffsetDeg: params.rotationDeg,
      skewXDeg: params.perspectiveDeg,
      liftPx: params.liftPx,
    });

    if (params.ambientShadow > 0) {
      drawAmbientShadow(ctx, this.preparedImage, matrix, {
        opacity: params.ambientShadow,
        blurPx: params.ambientShadowBlur,
      });
    }
    if (params.contactShadow > 0) {
      drawContactShadow(ctx, this.preparedImage, matrix, {
        opacity: params.contactShadow,
        blurPx: params.contactShadowBlur,
        offsetX: params.shadowOffsetX,
        offsetY: params.shadowOffsetY,
      });
    }
    drawWithMatrix(ctx, this.preparedImage, matrix, params.productOpacity);
  }

  // Export the current composite as a PNG data URL (full canvas resolution).
  exportPNG() {
    return this.canvas.toDataURL("image/png");
  }
}
