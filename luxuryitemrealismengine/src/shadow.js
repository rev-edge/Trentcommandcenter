// Directional shadow model.
//
// Two passes:
//   1. CONTACT — sharp, low opacity, small offset; sells "the product touches the body"
//   2. CAST — soft, lower opacity, larger offset; sells "the body is between the product and a light"
//
// Both shadows are rendered from the product's alpha mask (silhouette) and
// offset along the unit vector pointing AWAY from the light source. A single
// `lightAngleDeg` controls direction:
//   0°   → light from the right    (shadow falls to the left)
//   90°  → light from below        (shadow falls upward — unusual)
//   135° → light from upper-left   (shadow falls lower-right) — default
//   180° → light from the left
//   270° → light from above        (shadow falls downward)

import { drawWithMatrix } from "./transform.js";

const silhouetteCache = new WeakMap();

function silhouette(image) {
  const cached = silhouetteCache.get(image);
  if (cached) return cached;
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const c = off.getContext("2d");
  c.drawImage(image, 0, 0);
  c.globalCompositeOperation = "source-in";
  c.fillStyle = "#000";
  c.fillRect(0, 0, w, h);
  silhouetteCache.set(image, off);
  return off;
}

function lightVector(angleDeg) {
  // Returns the unit vector pointing in the direction the SHADOW falls
  // (opposite the light source). angleDeg uses the math convention:
  // 0° = light from the right, 90° = light from above (the photo subject's
  // "up", which is canvas-down sin direction). 135° = upper-left light →
  // shadow falls lower-right. Canvas Y is positive downward, so the y
  // component of the shadow direction matches +sin(rad) when light is above.
  const rad = (angleDeg * Math.PI) / 180;
  return { x: -Math.cos(rad), y: Math.sin(rad) };
}

function drawShadow(ctx, image, matrix, { opacity, blurPx, distance, angleDeg }) {
  if (opacity <= 0) return;
  const v = lightVector(angleDeg);
  const offX = v.x * distance;
  const offY = v.y * distance;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.filter = `blur(${blurPx}px)`;
  ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e + offX, matrix.f + offY);
  ctx.drawImage(silhouette(image), -matrix.width / 2, -matrix.height / 2, matrix.width, matrix.height);
  ctx.restore();
}

// Sharp shadow band right at the contact line.
export function drawContactShadow(ctx, image, matrix, params) {
  drawShadow(ctx, image, matrix, {
    opacity: params.opacity ?? 0.5,
    blurPx: params.blurPx ?? 6,
    distance: params.distance ?? 3,
    angleDeg: params.angleDeg ?? 135,
  });
}

// Soft, longer cast shadow. The product silhouette is drawn larger and softer
// so the cast extends past the contact band naturally.
export function drawCastShadow(ctx, image, matrix, params) {
  drawShadow(ctx, image, matrix, {
    opacity: params.opacity ?? 0.25,
    blurPx: params.blurPx ?? 26,
    distance: params.distance ?? 18,
    angleDeg: params.angleDeg ?? 135,
  });
}

export { drawWithMatrix };
