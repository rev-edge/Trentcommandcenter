// Raster-first asset loader. Tries the high-resolution PNG/WebP transparent
// asset first; only falls back to the SVG silhouette if the raster cannot be
// fetched or decoded. Reports the resolved source so the UI can flag
// "placeholder" vs "realism" mode.

const cache = new Map();

/**
 * @param {import('./productProfile.js').ProductProfile} profile
 * @returns {Promise<{ image: HTMLImageElement, source: 'raster'|'fallback', warning?: string }>}
 */
export async function loadProductImage(profile) {
  const key = profile.id;
  if (cache.has(key)) return cache.get(key);
  const result = await resolve(profile);
  cache.set(key, result);
  return result;
}

async function resolve(profile) {
  const asset = profile.asset || {};
  if (asset.url) {
    try {
      const image = await loadRaster(asset.url);
      return { image, source: "raster" };
    } catch (err) {
      // fall through to SVG fallback
      console.warn(`[engine] raster missing for ${profile.id} (${asset.url}); using SVG fallback.`);
      if (asset.svgFallback) {
        const image = await loadSvg(asset.svgFallback);
        return { image, source: "fallback", warning: "Raster asset missing — placeholder shown." };
      }
      throw err;
    }
  }
  if (asset.svgFallback) {
    const image = await loadSvg(asset.svgFallback);
    return { image, source: "fallback", warning: "No raster configured — placeholder shown." };
  }
  throw new Error(`No asset for product ${profile.id}`);
}

function loadRaster(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load raster: ${url}`));
    img.src = url;
  });
}

function loadSvg(svgMarkup) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG fallback"));
    };
    img.src = url;
  });
}

export function clearAssetCache() {
  cache.clear();
}
