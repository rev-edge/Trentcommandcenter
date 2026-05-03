// Occlusion mask layer.
//
// A separate canvas the same size as the photo. Pixels marked here represent
// "this region of the body sits IN FRONT OF the product." During render, the
// compositor draws the product, then overlays the photo's pixels through the
// mask, so painted regions effectively cover the product.
//
// V1 supports two ways to populate the mask:
//   1. Manual brush — user paints with a soft round brush (or erases).
//   2. Auto skin detection — the mask is filled where the photo's pixels
//      match the skin tone sampled near the anchor. Useful default for
//      "fingers in front of bag handle" or "wrist edge over watch case."
//
// The mask alpha channel is the only thing that matters; we paint pure
// white at variable alpha so soft brushes give soft occlusion edges.

const BRUSH = {
  MIN_RADIUS: 4,
  MAX_RADIUS: 200,
  HARDNESS: 0.55,   // 0 = fully soft, 1 = hard edge
};

export class OcclusionLayer {
  constructor() {
    this.mask = document.createElement("canvas");
    this.mask.width = 1;
    this.mask.height = 1;
    this.ctx = this.mask.getContext("2d", { willReadFrequently: true });
    this.dirty = false;
  }

  resize(width, height) {
    if (this.mask.width === width && this.mask.height === height) return;
    const prev = this.mask;
    const next = document.createElement("canvas");
    next.width = width;
    next.height = height;
    const nc = next.getContext("2d", { willReadFrequently: true });
    if (prev.width > 1) {
      nc.drawImage(prev, 0, 0, width, height);
    }
    this.mask = next;
    this.ctx = nc;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.mask.width, this.mask.height);
    this.dirty = false;
  }

  paint(x, y, radius, opacity = 1) {
    const r = Math.max(BRUSH.MIN_RADIUS, Math.min(BRUSH.MAX_RADIUS, radius));
    const grad = this.ctx.createRadialGradient(x, y, r * BRUSH.HARDNESS, x, y, r);
    grad.addColorStop(0, `rgba(255,255,255,${opacity})`);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    this.ctx.save();
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
    this.dirty = true;
  }

  erase(x, y, radius) {
    const r = Math.max(BRUSH.MIN_RADIUS, Math.min(BRUSH.MAX_RADIUS, radius));
    this.ctx.save();
    this.ctx.globalCompositeOperation = "destination-out";
    const grad = this.ctx.createRadialGradient(x, y, r * BRUSH.HARDNESS, x, y, r);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
    this.dirty = true;
  }

  // Auto-fill the mask using skin-color similarity from the photo.
  // sampleColor: {r,g,b} — a representative skin sample taken near the anchor.
  // bbox: {x,y,w,h} — region of the photo to evaluate (full image if omitted).
  // tolerance: 0..1 — how close to the sample a pixel must be to be marked.
  autoFromSkin(photoCanvas, sampleColor, { bbox, tolerance = 0.18, feather = true } = {}) {
    this.resize(photoCanvas.width, photoCanvas.height);
    const region = bbox || { x: 0, y: 0, w: photoCanvas.width, h: photoCanvas.height };
    const photoCtx = photoCanvas.getContext("2d");
    const data = photoCtx.getImageData(region.x, region.y, region.w, region.h);
    const out = new ImageData(region.w, region.h);
    const tol = tolerance * 441; // sqrt(3*255^2) max distance in RGB cube
    for (let i = 0; i < data.data.length; i += 4) {
      const dr = data.data[i] - sampleColor.r;
      const dg = data.data[i + 1] - sampleColor.g;
      const db = data.data[i + 2] - sampleColor.b;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (dist < tol) {
        out.data[i] = out.data[i + 1] = out.data[i + 2] = 255;
        out.data[i + 3] = Math.round(255 * (1 - dist / tol));
      }
    }
    this.ctx.putImageData(out, region.x, region.y);
    if (feather) {
      // Soften the auto mask via a single blur pass.
      const blurred = document.createElement("canvas");
      blurred.width = this.mask.width;
      blurred.height = this.mask.height;
      const bc = blurred.getContext("2d");
      bc.filter = "blur(2px)";
      bc.drawImage(this.mask, 0, 0);
      this.ctx.clearRect(0, 0, this.mask.width, this.mask.height);
      this.ctx.drawImage(blurred, 0, 0);
    }
    this.dirty = true;
  }

  // Compositor-side helper: applies the mask by overlaying the photo's
  // pixels through the mask onto the destination canvas (which already has
  // the product drawn). Painted regions of the mask reveal photo pixels,
  // covering the product.
  applyTo(destCtx, photoCanvas) {
    if (!this.dirty || !photoCanvas) return;
    // Compose photo through the mask onto an offscreen buffer, then draw it.
    const buf = document.createElement("canvas");
    buf.width = photoCanvas.width;
    buf.height = photoCanvas.height;
    const bc = buf.getContext("2d");
    bc.drawImage(photoCanvas, 0, 0);
    bc.globalCompositeOperation = "destination-in";
    bc.drawImage(this.mask, 0, 0);
    destCtx.save();
    destCtx.setTransform(1, 0, 0, 1, 0, 0);
    destCtx.drawImage(buf, 0, 0);
    destCtx.restore();
  }

  isPainted() {
    return this.dirty;
  }
}

// Pointer controller that translates pointer events on the display canvas
// into mask brushstrokes in mask-canvas coordinates.
export class OcclusionController {
  constructor(displayCanvas, layer, { onChange, getBrushRadius, getMode } = {}) {
    this.canvas = displayCanvas;
    this.layer = layer;
    this.onChange = onChange || (() => {});
    this.getBrushRadius = getBrushRadius || (() => 24);
    this.getMode = getMode || (() => "off"); // "paint" | "erase" | "off"
    this.dragging = false;
    this.lastPt = null;
    this._down = this._down.bind(this);
    this._move = this._move.bind(this);
    this._up = this._up.bind(this);
  }

  enable() {
    this.canvas.addEventListener("pointerdown", this._down);
    this.canvas.addEventListener("pointermove", this._move);
    window.addEventListener("pointerup", this._up);
  }

  disable() {
    this.canvas.removeEventListener("pointerdown", this._down);
    this.canvas.removeEventListener("pointermove", this._move);
    window.removeEventListener("pointerup", this._up);
  }

  _toLocal(evt) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / rect.width;
    const sy = this.canvas.height / rect.height;
    return { x: (evt.clientX - rect.left) * sx, y: (evt.clientY - rect.top) * sy };
  }

  _stroke(p) {
    const r = this.getBrushRadius();
    const mode = this.getMode();
    if (this.lastPt) {
      // Interpolate dots between samples so fast drags don't leave gaps.
      const dx = p.x - this.lastPt.x;
      const dy = p.y - this.lastPt.y;
      const steps = Math.max(1, Math.floor(Math.hypot(dx, dy) / Math.max(2, r * 0.3)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = this.lastPt.x + dx * t;
        const y = this.lastPt.y + dy * t;
        if (mode === "paint") this.layer.paint(x, y, r);
        else if (mode === "erase") this.layer.erase(x, y, r);
      }
    } else {
      if (mode === "paint") this.layer.paint(p.x, p.y, r);
      else if (mode === "erase") this.layer.erase(p.x, p.y, r);
    }
    this.lastPt = p;
  }

  _down(evt) {
    if (this.getMode() === "off") return;
    this.dragging = true;
    this.lastPt = null;
    this.canvas.setPointerCapture?.(evt.pointerId);
    this._stroke(this._toLocal(evt));
    this.onChange();
  }

  _move(evt) {
    if (!this.dragging) return;
    this._stroke(this._toLocal(evt));
    this.onChange();
  }

  _up() {
    this.dragging = false;
    this.lastPt = null;
  }
}
