// Lightweight color/exposure matching. We don't redraw the product — we sample
// the scene tone near the anchor and overlay a low-opacity tint on the product
// layer so it inherits the photo's warmth/coolness.

// Sample the average RGB of a circular region in a source canvas/image.
export function sampleAverageColor(sourceCanvas, x, y, radius = 40) {
  const ctx = sourceCanvas.getContext("2d");
  const r = Math.max(2, Math.floor(radius));
  const data = ctx.getImageData(Math.max(0, x - r), Math.max(0, y - r), r * 2, r * 2).data;
  let R = 0, G = 0, B = 0, count = 0;
  for (let i = 0; i < data.length; i += 16) {
    if (data[i + 3] === 0) continue;
    R += data[i];
    G += data[i + 1];
    B += data[i + 2];
    count++;
  }
  if (count === 0) return { r: 255, g: 255, b: 255 };
  return { r: Math.round(R / count), g: Math.round(G / count), b: Math.round(B / count) };
}

// Apply an ambient tint over the product, masked to the product's own alpha
// shape (via "source-atop"), at a low opacity. This nudges the product's
// color toward the scene's white balance without redrawing pixels.
export function applyAmbientTint(productCtx, color, strength = 0.18) {
  productCtx.save();
  productCtx.globalCompositeOperation = "source-atop";
  productCtx.globalAlpha = Math.max(0, Math.min(1, strength));
  productCtx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
  productCtx.fillRect(0, 0, productCtx.canvas.width, productCtx.canvas.height);
  productCtx.restore();
}

// Edge-feather: erode the product's alpha by a small amount via blur+mask so
// hard edges don't read as "pasted." Returns a new offscreen canvas.
export function featherEdges(image, featherPx = 1.5) {
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const c = off.getContext("2d");
  c.filter = `blur(${featherPx}px)`;
  c.drawImage(image, 0, 0);
  c.filter = "none";
  return off;
}
