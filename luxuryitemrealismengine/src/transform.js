// Deterministic transform math. No ML — only geometry.

export function vectorBetween(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  return { dx, dy, length, angle };
}

// Convert two anchor points + a known real-world reference width (mm) into a
// scale: mm-per-pixel. The line drawn between anchors is assumed to span
// `referenceWidthMm` in the real world.
export function pixelsPerMm(anchorA, anchorB, referenceWidthMm) {
  const { length } = vectorBetween(anchorA, anchorB);
  if (referenceWidthMm <= 0 || length <= 0) return 1;
  return length / referenceWidthMm;
}

// Compute the on-canvas size for a product, given its real width (mm), the
// scene's pixels-per-mm, and a user fine-tune scale multiplier. Prefers
// visualWidthMm/visualHeightMm when set (e.g., bracelets render at wrist
// width, not their unrolled length).
export function productPixelSize(product, ppmm, fineScale = 1) {
  const widthMm = product.visualWidthMm ?? product.widthMm;
  const heightMm = product.visualHeightMm ?? product.heightMm;
  return { width: widthMm * ppmm * fineScale, height: heightMm * ppmm * fineScale };
}

// Build a CSS / Canvas affine transform matrix string for a product placed at
// the midpoint of two anchors, rotated to match the anchor angle, with
// optional perspective skew and vertical lift (e.g., for a watch sitting on
// top of the wrist rather than centered through it).
export function composeMatrix({ anchorA, anchorB, width, height, rotationOffsetDeg = 0, skewXDeg = 0, liftPx = 0 }) {
  const cx = (anchorA.x + anchorB.x) / 2;
  const cy = (anchorA.y + anchorB.y) / 2;
  const { angle } = vectorBetween(anchorA, anchorB);
  const rotation = angle + (rotationOffsetDeg * Math.PI) / 180;
  const skew = (skewXDeg * Math.PI) / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  // Perpendicular lift (so liftPx moves the product away from the anchor line
  // along the wrist's normal, not just up the screen).
  const nx = -sin;
  const ny = cos;
  const tx = cx + nx * liftPx;
  const ty = cy + ny * liftPx;
  return {
    a: cos,
    b: sin,
    c: -sin + Math.tan(skew) * cos,
    d: cos + Math.tan(skew) * sin,
    e: tx,
    f: ty,
    width,
    height,
  };
}

// Apply a matrix to a CanvasRenderingContext2D and draw a centered image.
export function drawWithMatrix(ctx, image, matrix, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
  ctx.drawImage(image, -matrix.width / 2, -matrix.height / 2, matrix.width, matrix.height);
  ctx.restore();
}
