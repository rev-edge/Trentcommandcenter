// Post-processing FX applied to the prepared product image BEFORE it's drawn
// onto the canvas. Each function takes an offscreen product canvas (the
// result of feather + ambient tint) and mutates it in place so the
// compositor can chain them cheaply.
//
// All operations are alpha-aware: they only touch pixels where the product
// has alpha > 0 (so the surrounding transparent area stays empty) unless
// otherwise noted.

// Strap wrap-shading. The product asset is laid flat (e.g. watch strap
// running straight from top to bottom of the image), but in reality the
// strap CURVES around the wrist — the parts furthest from the case go
// underneath and into shadow. We fake this with a gradient darkening that
// peaks at the OUTER ENDS of the product's long axis and fades to zero at
// the case center. Combined with the body clip (which removes whatever
// extends past the wrist edge), this sells the wrap-around illusion
// without re-rendering or warping the asset.
//
// The "long axis" is automatic: whichever of width/height is larger.
// `strapFraction` controls how much of each end is treated as strap (the
// remainder in the middle is preserved as the case).
export function applyStrapWrapShade(productCanvas, {
  strength = 0.85,         // peak darkness at the very tips
  strapFraction = 0.35,    // top 35% + bottom 35% of long axis = strap region
  curve = 2.0,             // power curve — higher = darkens only the very ends
} = {}) {
  if (strength <= 0) return;
  const w = productCanvas.width, h = productCanvas.height;
  const ctx = productCanvas.getContext("2d");
  const longAxisVertical = h >= w;
  const span = longAxisVertical ? h : w;
  const strapPx = span * strapFraction;
  // Build a darkening gradient along the long axis, peaking at the ends.
  let grad;
  if (longAxisVertical) {
    grad = ctx.createLinearGradient(0, 0, 0, h);
  } else {
    grad = ctx.createLinearGradient(0, 0, w, 0);
  }
  // Ramp: full darkness at the very edge → zero at the strap-case boundary
  // → zero through the case → zero at the opposite case-strap boundary →
  // full darkness at the opposite edge.
  const stops = 16;
  for (let i = 0; i <= stops; i++) {
    const t = i / stops;
    const distFromCenter = Math.abs(t - 0.5) * 2;       // 0 at center, 1 at ends
    const strapStart = 1 - strapFraction * 2;            // e.g. 0.30 if frac=0.35
    let darken = 0;
    if (distFromCenter > strapStart) {
      const localT = (distFromCenter - strapStart) / (1 - strapStart);
      darken = Math.pow(localT, curve) * strength;
    }
    grad.addColorStop(t, `rgba(0,0,0,${darken.toFixed(3)})`);
  }
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Multi-stop linear-gradient mask along the light → shadow axis. Used to
// darken the side of the product opposite the light (contact press-in) and
// lift the lit side slightly. `lightAngleDeg` follows the same convention as
// shadow.js (135° = upper-left light).
//
// strength: 0..1, how strongly to darken/lift.
// lightTint / shadowTint: optional rgb objects; when provided, the gradient
// shifts product color toward the lit color on the lit side and toward the
// shadow color on the dark side. Subtle by design (alpha capped at 0.25).
export function applyDirectionalLight(productCanvas, lightAngleDeg, {
  strength = 0.18,
  lightTint = null,
  shadowTint = null,
} = {}) {
  if (strength <= 0) return;
  const w = productCanvas.width, h = productCanvas.height;
  const ctx = productCanvas.getContext("2d");
  const rad = (lightAngleDeg * Math.PI) / 180;
  // Light direction in canvas space (where shadow falls = away from light).
  // For 135°: shadow direction is (cos+, sin+), so light comes from (-cos, -sin).
  // Gradient runs FROM lit corner TO shadow corner across the product bbox.
  const dx = -Math.cos(rad), dy = Math.sin(rad);
  // Find points on the bbox perimeter for the gradient endpoints.
  const cx = w / 2, cy = h / 2;
  const r = Math.hypot(w, h) * 0.55;
  const x0 = cx + dx * r, y0 = cy + dy * r;          // shadow corner
  const x1 = cx - dx * r, y1 = cy - dy * r;          // light corner
  const grad = ctx.createLinearGradient(x1, y1, x0, y0);
  // Tint stops: light side warm, shadow side cool/dark.
  const ls = lightTint || { r: 255, g: 246, b: 225 };
  const ss = shadowTint || { r: 30, g: 28, b: 35 };
  grad.addColorStop(0, `rgba(${ls.r},${ls.g},${ls.b},${(strength * 0.55).toFixed(3)})`);
  grad.addColorStop(0.5, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(${ss.r},${ss.g},${ss.b},${(strength).toFixed(3)})`);
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Contact darkening — concentrate a darkening pass at the edge of the
// product on the SHADOW side. Sells "the watch presses into the skin."
// Implementation: clone the product silhouette, offset it slightly along the
// shadow direction, then composite it darker onto the product (source-atop)
// at low opacity. The edge that "sticks out" beyond the offset darkens.
export function applyContactDarken(productCanvas, lightAngleDeg, {
  strength = 0.35,
  bandFrac = 0.05,    // band thickness as fraction of min(width, height) — scales with asset
} = {}) {
  if (strength <= 0) return;
  const band = Math.max(8, Math.round(Math.min(productCanvas.width, productCanvas.height) * bandFrac));
  const w = productCanvas.width, h = productCanvas.height;
  const ctx = productCanvas.getContext("2d");
  const rad = (lightAngleDeg * Math.PI) / 180;
  const dx = -Math.cos(rad);  // shadow direction
  const dy = Math.sin(rad);
  // Build a darkening "ring" at the shadow-side edge by drawing the product's
  // own alpha as a black silhouette, offset by `band` along shadow direction,
  // then masking the original product.
  const sil = document.createElement("canvas");
  sil.width = w; sil.height = h;
  const sc = sil.getContext("2d");
  sc.drawImage(productCanvas, 0, 0);
  sc.globalCompositeOperation = "source-in";
  sc.fillStyle = `rgba(0,0,0,${strength.toFixed(3)})`;
  sc.fillRect(0, 0, w, h);
  // Erase the silhouette shifted AWAY from the shadow side; what remains is
  // a band on the shadow side (where the product "sinks" into the skin).
  sc.globalCompositeOperation = "destination-out";
  sc.drawImage(productCanvas, -dx * band, -dy * band);
  // Soften the band so the edge isn't a hard line
  const soft = document.createElement("canvas");
  soft.width = w; soft.height = h;
  const softCtx = soft.getContext("2d");
  softCtx.filter = `blur(${Math.max(2, band * 0.45)}px)`;
  softCtx.drawImage(sil, 0, 0);
  softCtx.filter = "none";
  // Re-clip to product alpha so blur doesn't bleed past the silhouette
  softCtx.globalCompositeOperation = "destination-in";
  softCtx.drawImage(productCanvas, 0, 0);
  // Composite the dark sliver onto the product
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.drawImage(soft, 0, 0);
  ctx.restore();
}

// Edge grain — sample the photo's pixels along the product's edge ring
// (where alpha is feathered between 0 and 1) and gently blend them into the
// product so the cut doesn't read as a perfect PNG. Operates within the
// product canvas; we sample the photoCanvas using anchor-derived matrix to
// know where each product pixel lives in scene space.
//
// Effect is intentionally subtle (≤ 12% blend) — it disrupts the geometric
// edge enough to avoid the "decal" look without making the product fuzzy.
export function applyEdgeGrain(productCanvas, photoCanvas, matrix, {
  strength = 0.12,
  edgeBand = 2.5,
} = {}) {
  if (strength <= 0 || !photoCanvas) return;
  const pw = productCanvas.width, ph = productCanvas.height;
  const pCtx = productCanvas.getContext("2d", { willReadFrequently: true });
  const data = pCtx.getImageData(0, 0, pw, ph);
  const px = data.data;
  // Pre-fetch photo as ImageData for fast random reads.
  const phCtx = photoCanvas.getContext("2d", { willReadFrequently: true });
  const phImg = phCtx.getImageData(0, 0, photoCanvas.width, photoCanvas.height);
  const phPx = phImg.data;
  const phW = photoCanvas.width, phH = photoCanvas.height;
  // matrix: { a, b, c, d, e, f, width, height }
  // product pixel (i, j) in product-canvas space → scene = M * (i - pw/2, j - ph/2)
  const pwHalf = pw / 2, phHalf = ph / 2;
  for (let j = 0; j < ph; j++) {
    for (let i = 0; i < pw; i++) {
      const idx = (j * pw + i) * 4;
      const a = px[idx + 3];
      if (a === 0 || a >= 252) continue;             // skip fully transparent/opaque
      const t = (a / 255);
      // Gaussian-ish weight peaked at half-alpha (the feather band)
      const weight = Math.exp(-Math.pow((t - 0.5) * edgeBand, 2));
      if (weight < 0.05) continue;
      const lx = i - pwHalf;
      const ly = j - phHalf;
      // Apply matrix
      const sx = matrix.a * lx + matrix.c * ly + matrix.e;
      const sy = matrix.b * lx + matrix.d * ly + matrix.f;
      const ix = sx | 0, iy = sy | 0;
      if (ix < 0 || iy < 0 || ix >= phW || iy >= phH) continue;
      const sIdx = (iy * phW + ix) * 4;
      const blend = strength * weight;
      px[idx]     = px[idx]     * (1 - blend) + phPx[sIdx]     * blend;
      px[idx + 1] = px[idx + 1] * (1 - blend) + phPx[sIdx + 1] * blend;
      px[idx + 2] = px[idx + 2] * (1 - blend) + phPx[sIdx + 2] * blend;
    }
  }
  pCtx.putImageData(data, 0, 0);
}

// Directional asymmetric contact shadow. Draws a multi-layer shadow from
// the product silhouette, masked so the shadow is densest at the case edge
// on the side opposite the light, fading both away from the edge (distance)
// and around the product (azimuth). Replaces the previous uniform contact
// shadow.
export function drawDirectionalContactShadow(ctx, productImage, matrix, {
  lightAngleDeg = 135,
  opacity = 0.55,
  edgeOpacity = 0.85,
  blurPx = 6,
  spreadPx = 18,
} = {}) {
  if (opacity <= 0) return;
  const rad = (lightAngleDeg * Math.PI) / 180;
  const sx = -Math.cos(rad);
  const sy = Math.sin(rad);

  const pw = productImage.naturalWidth || productImage.width;
  const ph = productImage.naturalHeight || productImage.height;

  // Build shadow source: silhouette of the product.
  const sil = document.createElement("canvas");
  sil.width = pw; sil.height = ph;
  const sc = sil.getContext("2d");
  sc.drawImage(productImage, 0, 0);
  sc.globalCompositeOperation = "source-in";
  sc.fillStyle = "#000";
  sc.fillRect(0, 0, pw, ph);

  // Apply directional fade mask: stronger on shadow side, fading on lit side.
  sc.globalCompositeOperation = "destination-in";
  const cxL = pw / 2, cyL = ph / 2;
  const r = Math.hypot(pw, ph) * 0.6;
  const x0 = cxL - sx * r, y0 = cyL - sy * r;       // lit side
  const x1 = cxL + sx * r, y1 = cyL + sy * r;       // shadow side
  const mask = sc.createLinearGradient(x0, y0, x1, y1);
  mask.addColorStop(0, "rgba(255,255,255,0.10)");    // soft on lit side
  mask.addColorStop(0.5, "rgba(255,255,255,0.55)");
  mask.addColorStop(1, "rgba(255,255,255,1)");       // full on shadow side
  sc.fillStyle = mask;
  sc.fillRect(0, 0, pw, ph);

  // 1) Tight, sharp band right at the contact edge (high opacity, low blur).
  ctx.save();
  ctx.globalAlpha = edgeOpacity;
  ctx.filter = `blur(${Math.max(1, blurPx * 0.4)}px)`;
  ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d,
                   matrix.e + sx * 1.2, matrix.f + sy * 1.2);
  ctx.drawImage(sil, -matrix.width / 2, -matrix.height / 2, matrix.width, matrix.height);
  ctx.restore();

  // 2) Mid layer (medium offset + blur).
  ctx.save();
  ctx.globalAlpha = opacity * 0.7;
  ctx.filter = `blur(${blurPx}px)`;
  ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d,
                   matrix.e + sx * (spreadPx * 0.35), matrix.f + sy * (spreadPx * 0.35));
  ctx.drawImage(sil, -matrix.width / 2, -matrix.height / 2, matrix.width, matrix.height);
  ctx.restore();

  // 3) Wider falloff (low opacity, big blur) — feathered contact halo.
  ctx.save();
  ctx.globalAlpha = opacity * 0.35;
  ctx.filter = `blur(${blurPx * 2.5}px)`;
  ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d,
                   matrix.e + sx * spreadPx, matrix.f + sy * spreadPx);
  ctx.drawImage(sil, -matrix.width / 2, -matrix.height / 2, matrix.width, matrix.height);
  ctx.restore();
}

// Body-silhouette mask. Builds a solid mask covering everywhere the photo
// matches scene skin tone (with a generous tolerance + slight dilation +
// soft blur). Used to CLIP the product layer so anything extending past
// the body — typically a watch strap continuing onto the table — is hidden.
// This is the main "wrap-around illusion" lever: the strap terminates
// exactly where the wrist edge ends, reading as if it wraps behind the wrist.
//
// The mask is expensive to compute (full-photo pixel scan) so the caller
// is expected to cache it per (photoCanvas, skinTone) pair.
export function buildBodyMask(photoCanvas, skinTone, {
  tolerance = 0.32,
  // Positive = grow mask outward (gives product edges margin); negative =
  // shrink mask inward (clips the strap deeper inside the wrist, where the
  // real wrap-behind point actually is on a cylindrical wrist viewed from
  // above). Negative values are the realism lever for watches/bracelets.
  dilatePx = -22,
  softPx = 26,             // very strong feather so the strap fades smoothly
} = {}) {
  if (!photoCanvas || !skinTone) return null;
  const W = photoCanvas.width;
  const H = photoCanvas.height;
  const photo = photoCanvas.getContext("2d", { willReadFrequently: true })
    .getImageData(0, 0, W, H);
  const out = new ImageData(W, H);
  const tol = tolerance * 441;
  const skinL = (skinTone.r + skinTone.g + skinTone.b) / 3;
  for (let i = 0; i < photo.data.length; i += 4) {
    const r = photo.data[i], g = photo.data[i + 1], b = photo.data[i + 2];
    const reddish = r > b && r >= g - 5;
    if (!reddish) continue;
    const dr = r - skinTone.r;
    const dg = g - skinTone.g;
    const db = b - skinTone.b;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    const L = (r + g + b) / 3;
    const luminanceOk = L >= skinL * 0.45 && L <= skinL * 1.6;
    if (dist >= tol && !(luminanceOk && reddish)) continue;
    out.data[i] = out.data[i + 1] = out.data[i + 2] = 255;
    out.data[i + 3] = 255;
  }
  const raw = document.createElement("canvas");
  raw.width = W; raw.height = H;
  raw.getContext("2d").putImageData(out, 0, 0);

  let shaped;
  if (dilatePx >= 0) {
    // Dilate: 8-direction offset stamps for a solid expanded mask.
    shaped = document.createElement("canvas");
    shaped.width = W; shaped.height = H;
    const sc = shaped.getContext("2d");
    const r = dilatePx || 1;
    const offs = [
      [r, 0], [-r, 0], [0, r], [0, -r],
      [r, r], [r, -r], [-r, r], [-r, -r],
      [r * 0.5, 0], [-r * 0.5, 0], [0, r * 0.5], [0, -r * 0.5],
    ];
    for (const [dx, dy] of offs) sc.drawImage(raw, dx, dy);
    sc.drawImage(raw, 0, 0);
  } else {
    // Erode: keep only pixels that are mask AND mask-shifted in every
    // direction. Implemented via successive destination-in operations.
    shaped = document.createElement("canvas");
    shaped.width = W; shaped.height = H;
    const sc = shaped.getContext("2d");
    sc.drawImage(raw, 0, 0);
    const r = -dilatePx;
    const offs = [
      [r, 0], [-r, 0], [0, r], [0, -r],
      [r, r], [r, -r], [-r, r], [-r, -r],
    ];
    sc.globalCompositeOperation = "destination-in";
    for (const [dx, dy] of offs) sc.drawImage(raw, dx, dy);
    sc.globalCompositeOperation = "source-over";
  }
  // Soft edge.
  const soft = document.createElement("canvas");
  soft.width = W; soft.height = H;
  const sctx = soft.getContext("2d");
  sctx.filter = `blur(${softPx}px)`;
  sctx.drawImage(shaped, 0, 0);
  return soft;
}

// Auto skin-edge occlusion. Builds a transient mask the same size as the
// scene canvas that marks pixels matching scene skin tone within a thin
// halo around the product perimeter. Returns the mask canvas; the caller
// composites it on top of any user-painted occlusion.
export function buildAutoEdgeOcclusionMask(photoCanvas, productImage, matrix, skinTone, {
  tolerance = 0.16,
  reachPx = 18,
} = {}) {
  if (!photoCanvas || !productImage || !skinTone) return null;
  // 1) Solid silhouette of product in scene space.
  const sceneSil = document.createElement("canvas");
  sceneSil.width = photoCanvas.width;
  sceneSil.height = photoCanvas.height;
  const ssc = sceneSil.getContext("2d", { willReadFrequently: true });
  ssc.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
  ssc.drawImage(productImage, -matrix.width / 2, -matrix.height / 2, matrix.width, matrix.height);
  ssc.setTransform(1, 0, 0, 1, 0, 0);
  // Threshold to solid alpha so dilation stays sharp.
  ssc.globalCompositeOperation = "source-in";
  ssc.fillStyle = "#000";
  ssc.fillRect(0, 0, sceneSil.width, sceneSil.height);
  ssc.globalCompositeOperation = "source-over";

  // 2) Dilate by reachPx using a single-pass 8-direction offset draw — gives
  // a SOLID expanded silhouette without the alpha falloff blur produces.
  const dilated = document.createElement("canvas");
  dilated.width = sceneSil.width; dilated.height = sceneSil.height;
  const dc = dilated.getContext("2d");
  const r = reachPx;
  const offsets = [
    [r, 0], [-r, 0], [0, r], [0, -r],
    [r, r], [r, -r], [-r, r], [-r, -r],
    [r * 0.6, r * 0.6], [-r * 0.6, r * 0.6], [r * 0.6, -r * 0.6], [-r * 0.6, -r * 0.6],
  ];
  for (const [dx, dy] of offsets) dc.drawImage(sceneSil, dx, dy);
  dc.drawImage(sceneSil, 0, 0);

  // 3) Subtract original to leave a SOLID outer ring of width ~reachPx.
  dc.globalCompositeOperation = "destination-out";
  dc.drawImage(sceneSil, 0, 0);
  dc.globalCompositeOperation = "source-over";

  // 4) Inside the ring, mark pixels matching skin tone.
  const ringData = dc.getImageData(0, 0, dilated.width, dilated.height).data;
  const photoData = photoCanvas.getContext("2d", { willReadFrequently: true })
    .getImageData(0, 0, photoCanvas.width, photoCanvas.height).data;
  const out = new ImageData(dilated.width, dilated.height);
  const tol = tolerance * 441;
  for (let i = 0; i < ringData.length; i += 4) {
    if (ringData[i + 3] < 100) continue;          // outside ring
    const dr = photoData[i] - skinTone.r;
    const dg = photoData[i + 1] - skinTone.g;
    const db = photoData[i + 2] - skinTone.b;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist >= tol) continue;
    out.data[i] = out.data[i + 1] = out.data[i + 2] = 255;
    // Solid alpha when match is strong, fading with distance from skin tone.
    out.data[i + 3] = Math.round(255 * Math.pow(1 - dist / tol, 0.6));
  }
  const tmp = document.createElement("canvas");
  tmp.width = dilated.width; tmp.height = dilated.height;
  const tmpCtx = tmp.getContext("2d");
  tmpCtx.putImageData(out, 0, 0);
  // Light blur to soften edges of the auto mask so it doesn't look like a
  // hard cookie cutter pasted on top.
  const soft = document.createElement("canvas");
  soft.width = tmp.width; soft.height = tmp.height;
  const softCtx = soft.getContext("2d");
  softCtx.filter = "blur(1.2px)";
  softCtx.drawImage(tmp, 0, 0);
  return soft;
}
