// Luxury Item Realism Engine — public entry.
//
// Architecture:
//   compositor.js     deterministic render pipeline (no AI in render path)
//   transform.js      scale / rotate / perspective math
//   shadow.js         alpha-derived contact + ambient shadows
//   lighting.js       scene color sampling, ambient tint, edge feather
//   anchors.js        two-point landmark placement
//   assetLoader.js    raster-first loader with SVG fallback
//   catalog.js        sample products as normalized ProductProfiles
//   productProfile.js metadata schema
//   categoryPresets.js per-category render defaults
//   ai/hooks.js       enrichment stubs (prep only — never used in render)
//   ui.js             single-screen widget controller
//   embed.js          retailer embed entry (mountLuxuryTryOn)

export { mountLuxuryTryOn } from "./embed.js";
export { mountWidget } from "./ui.js";
export { Compositor } from "./compositor.js";
export { CATALOG_PROFILES, profilesByCategory, profileById } from "./catalog.js";
export { CATEGORY_PRESETS, presetFor, resolveRenderParams } from "./categoryPresets.js";
export { makeProfile, hasRasterAsset, isFallbackOnly } from "./productProfile.js";
export { loadProductImage, clearAssetCache } from "./assetLoader.js";
export * as AIHooks from "./ai/hooks.js";

export const engineMeta = {
  name: "luxuryitemrealismengine",
  version: "0.2.0",
  realismPath: "raster-png-webp-with-transparency",
  fallbackPath: "svg-silhouette",
};
