// Contact-shadow generation. Builds a soft shadow from the product's alpha
// channel, then composites it under the product layer using the same matrix.

import { drawWithMatrix } from "./transform.js";

// Render a soft drop shadow by drawing the product image, tinted black, with
// a Gaussian blur. The shadow is offset slightly along the lighting direction.
export function drawContactShadow(ctx, image, matrix, { opacity = 0.45, blurPx = 14, offsetX = 4, offsetY = 8 } = {}) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.filter = `blur(${blurPx}px)`;
  ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e + offsetX, matrix.f + offsetY);
  // Draw a black silhouette by masking the source through globalCompositeOperation.
  // We draw the image, then paint it black using "source-in" inside an offscreen
  // canvas so the alpha shape is preserved.
  ctx.drawImage(silhouette(image), -matrix.width / 2, -matrix.height / 2, matrix.width, matrix.height);
  ctx.restore();
}

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

// A wider, softer ambient shadow that sits beneath the product to anchor it to
// the scene. Very low opacity, large blur, no offset. Helps avoid the "sticker"
// look without needing real ray-traced shadows.
export function drawAmbientShadow(ctx, image, matrix, { opacity = 0.25, blurPx = 28 } = {}) {
  drawContactShadow(ctx, image, matrix, { opacity, blurPx, offsetX: 0, offsetY: 4 });
}

export { drawWithMatrix };
