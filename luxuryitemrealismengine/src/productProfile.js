// Product profile metadata schema. The render engine consumes a normalized
// ProductProfile so the rest of the system stays decoupled from specific
// retailers, scrapers, or AI enrichment sources.

/**
 * @typedef {Object} ProductAsset
 * @property {string} url
 * @property {("png"|"webp"|"jpg")} [format]
 * @property {boolean} [hasAlpha]
 * @property {number} [qualityScore]
 * @property {string} [svgFallback]
 * @property {("hero"|"detail"|"calibration"|"placeholder")} [role]
 */

/**
 * @typedef {Object} ProductDimensions
 * @property {number} widthMm        Catalog width (legacy) — defaults to visualWidthMm if not set.
 * @property {number} heightMm       Catalog height — defaults to visual height if not set.
 * @property {number} [depthMm]
 * @property {number} [visualWidthMm]    On-screen width when rendered on the body. For a bracelet
 *                                       this is the visible top-arc width across the wrist (~55mm),
 *                                       NOT its unrolled length.
 * @property {number} [visualHeightMm]   On-screen height (same coordinate system as visualWidthMm).
 * @property {number} [circumferenceMm]  Real-world unrolled / wrap length. Used for sizing
 *                                       guidance, not direct rendering.
 */

/**
 * @typedef {Object} ProductProfile
 * @property {string} id
 * @property {string} name
 * @property {string} brand
 * @property {string} model
 * @property {("watch"|"ring"|"bracelet"|"bag")} category
 * @property {ProductDimensions} dimensions
 * @property {string[]} [materials]
 * @property {string} [finish]
 * @property {ProductAsset} asset
 * @property {ProductAsset[]} [alternates]
 * @property {("wrist"|"finger"|"hand")} anchor
 * @property {number} refMm
 * @property {("hero"|"detail")} [usability]   "hero" = full product visible & wearable;
 *                                              "detail" = close-up / partial / lifestyle (not a
 *                                              standalone try-on asset).
 * @property {Object} [renderHints]
 * @property {string} [sourceUrl]
 */

export function makeProfile(input) {
  const visualWidthMm = input.dimensions?.visualWidthMm ?? input.dimensions?.widthMm ?? input.widthMm;
  const visualHeightMm = input.dimensions?.visualHeightMm ?? input.dimensions?.heightMm ?? input.heightMm;
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
      visualWidthMm,
      visualHeightMm,
      circumferenceMm: input.dimensions?.circumferenceMm,
    },
    materials: input.materials || [],
    finish: input.finish || "",
    asset: normalizeAsset(input.asset || {}),
    alternates: (input.alternates || []).map(normalizeAsset),
    anchor: input.anchor,
    refMm: input.refMm,
    usability: input.usability || "hero",
    renderHints: input.renderHints || {},
    sourceUrl: input.sourceUrl || "",
    enrichedAt: input.enrichedAt || null,
  };
}

function normalizeAsset(a) {
  return {
    url: a.url || "",
    format: a.format || inferFormat(a.url),
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

export function hasRasterAsset(profile) {
  return Boolean(profile?.asset?.url) && profile.asset.format !== "svg";
}

export function isFallbackOnly(profile) {
  return !hasRasterAsset(profile) && Boolean(profile?.asset?.svgFallback);
}

export function visualSizeMm(profile) {
  const d = profile.dimensions;
  return {
    widthMm: d.visualWidthMm ?? d.widthMm,
    heightMm: d.visualHeightMm ?? d.heightMm,
  };
}
