// AI enrichment hooks — stubbed for V1.
//
// IMPORTANT: AI never participates in the final composite. It is used only for
// product preparation and metadata enrichment. The render pipeline in
// compositor.js is fully deterministic and only consumes the outputs of these
// hooks (better images, better metadata), never live AI generation.
//
// Each hook is an async function with a stable signature so production
// implementations (vision model, segmenter, scoring model) can be swapped in
// without touching the engine.

/**
 * Enrich a partial product record with brand/model/material guesses, sourced
 * from a vision-language model. V1 stub returns the input unchanged with a
 * timestamp.
 * @param {object} partial
 * @returns {Promise<object>}
 */
export async function enrichProduct(partial) {
  return { ...partial, enrichedAt: Date.now() };
}

/**
 * Background removal. Production: call a segmentation model (SAM,
 * birefnet, etc.) and return a transparent PNG blob. V1 stub returns the
 * source image untouched.
 * @param {Blob|HTMLImageElement} input
 * @returns {Promise<Blob|HTMLImageElement>}
 */
export async function removeBackground(input) {
  return input;
}

/**
 * Score image quality (resolution, sharpness, exposure, framing) for ranking
 * candidate raster assets. Returns 0..1.
 */
export async function qualityScore(image) {
  const w = image?.naturalWidth || image?.width || 0;
  const h = image?.naturalHeight || image?.height || 0;
  if (!w || !h) return 0;
  const px = w * h;
  // Heuristic: 1MP -> 0.5, 4MP+ -> 1.0. Replace with model in production.
  return Math.min(1, Math.max(0.1, px / 4_000_000));
}

/**
 * Pick the best image from a candidate set using qualityScore.
 * @param {Array<{image: HTMLImageElement, meta?: object}>} candidates
 */
export async function pickBestImage(candidates) {
  if (!candidates?.length) return null;
  const scored = await Promise.all(candidates.map(async c => ({ ...c, score: await qualityScore(c.image) })));
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

/**
 * Estimate or extract real-world dimensions from a product page / image.
 * Production: parse retailer HTML or call a VLM. V1 stub returns null,
 * forcing the engine to fall back to category defaults.
 */
export async function extractSpecs(/* sourceUrl, image */) {
  return null;
}
