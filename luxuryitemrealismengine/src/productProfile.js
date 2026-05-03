// Product profile metadata schema. The render engine consumes a normalized
// ProductProfile so the rest of the system stays decoupled from specific
// retailers, scrapers, or AI enrichment sources.

/**
 * @typedef {Object} ProductAsset
 * @property {string} url            - Primary high-res raster (PNG/WebP) URL with transparency.
 * @property {("png"|"webp"|"jpg")} [format]
 * @property {number} [naturalWidthPx]
 * @property {number} [naturalHeightPx]
 * @property {boolean} [hasAlpha]    - True if background already removed.
 * @property {number} [qualityScore] - 0..1 enrichment-time score from QA model.
 * @property {string} [svgFallback]  - Optional SVG markup used ONLY when raster is unavailable.
 * @property {("hero"|"calibration"|"placeholder")} [role]
 */

/**
 * @typedef {Object} ProductProfile
 * @property {string} id
 * @property {string} name
 * @property {string} brand
 * @property {string} model
 * @property {("watch"|"ring"|"bracelet"|"bag")} category
 * @property {Object} dimensions
 * @property {number} dimensions.widthMm
 * @property {number} dimensions.heightMm
 * @property {number} [dimensions.depthMm]
 * @property {string[]} [materials]    - e.g., ["904L stainless", "sapphire crystal"]
 * @property {string} [finish]         - e.g., "polished", "brushed", "PVD"
 * @property {ProductAsset} asset      - Primary render asset (raster preferred).
 * @property {ProductAsset[]} [alternates]
 * @property {("wrist"|"finger"|"hand")} anchor
 * @property {number} refMm            - Real-world mm spanned by the user-drawn anchor line.
 * @property {Object} [renderHints]
 * @property {number} [renderHints.liftPx]
 * @property {number} [renderHints.rotationOffsetDeg]
 * @property {number} [renderHints.perspectiveDeg]
 * @property {number} [renderHints.contactShadow]
 * @property {string} [sourceUrl]      - Where this product came from.
 * @property {number} [enrichedAt]     - Unix ms.
 */

// Build a normalized profile, filling defaults. Keeps callers terse and the
// engine's internal contract strict.
export function makeProfile(input) {
  return {
    id: input.id,
    name: input.name,
    brand: input.brand || "",
    model: input.model || input.name,
    category: input.category,
    dimensions: {
      widthMm: input.dimensions?.widthMm ?? input.widthMm,
      heightMm: input.dimensions?.heightMm ?? input.heightMm,
      depthMm: input.dimensions?.depthMm,
    },
    materials: input.materials || [],
    finish: input.finish || "",
    asset: normalizeAsset(input.asset || {}),
    alternates: (input.alternates || []).map(normalizeAsset),
    anchor: input.anchor,
    refMm: input.refMm,
    renderHints: input.renderHints || {},
    sourceUrl: input.sourceUrl || "",
    enrichedAt: input.enrichedAt || null,
  };
}

function normalizeAsset(a) {
  return {
    url: a.url || "",
    format: a.format || inferFormat(a.url),
    naturalWidthPx: a.naturalWidthPx,
    naturalHeightPx: a.naturalHeightPx,
    hasAlpha: a.hasAlpha ?? true,
    qualityScore: a.qualityScore,
    svgFallback: a.svgFallback || "",
    role: a.role || "hero",
  };
}

function inferFormat(url) {
  if (!url) return undefined;
  const m = url.toLowerCase().match(/\.(png|webp|jpg|jpeg)(\?|$)/);
  if (!m) return undefined;
  return m[1] === "jpeg" ? "jpg" : m[1];
}

// True if the profile has a usable raster asset (preferred render path).
export function hasRasterAsset(profile) {
  return Boolean(profile?.asset?.url) && profile.asset.format !== "svg";
}

// True if we'll have to fall back to the SVG placeholder. The UI should
// surface this to the user so they know the realism is degraded.
export function isFallbackOnly(profile) {
  return !hasRasterAsset(profile) && Boolean(profile?.asset?.svgFallback);
}
