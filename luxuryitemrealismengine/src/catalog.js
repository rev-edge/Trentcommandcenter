// Sample luxury accessory catalog for the V1 prototype.
//
// REALISM PATH: each product points to a high-resolution PNG/WebP raster with
// transparency under `assets/products/<category>/<id>.<ext>`. Drop those files
// in to replace the placeholders. The engine will use them as the primary
// render asset.
//
// FALLBACK PATH: each product also carries an SVG silhouette used only when
// the raster is missing (cold-start, calibration, debug). The UI surfaces
// "placeholder" status so we never confuse a fallback render with realism.

import { makeProfile } from "./productProfile.js";

// ---------- Fallback SVG silhouettes (placeholder only) ----------
//
// IMPORTANT: every silhouette must fill the FULL viewBox edge-to-edge along
// the product's nominal width × height. The compositor scales the entire SVG
// canvas to widthMm × heightMm via the anchor-derived ppmm, so any padding
// inside the viewBox visually shrinks the fallback below its declared size.
// The silhouettes are then exactly to-scale stand-ins for the missing raster.

const watchSilhouette = (style) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="800" height="960" preserveAspectRatio="xMidYMid meet">
    <!-- strap fills full vertical extent so the watch reads at its true size -->
    <rect x="36" y="0"   width="28" height="38" rx="4" fill="#3b3f47"/>
    <rect x="36" y="82"  width="28" height="38" rx="4" fill="#3b3f47"/>
    ${style === "square"
      ? `<rect x="14" y="34" width="72" height="52" rx="8" fill="#1a1d29" stroke="#9aa0aa" stroke-width="2"/>`
      : `<ellipse cx="50" cy="60" rx="36" ry="26" fill="#1a1d29" stroke="#9aa0aa" stroke-width="2"/>`}
  </svg>`;

const ringSilhouette = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 78" width="800" height="624" preserveAspectRatio="xMidYMid meet">
    <ellipse cx="50" cy="50" rx="44" ry="22" fill="none" stroke="#d4af37" stroke-width="9"/>
    <polygon points="50,4 62,18 56,28 44,28 38,18" fill="#eaf3ff" stroke="#ffffff" stroke-width="0.6"/>
  </svg>`;

const braceletSilhouette = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 175 6" width="1400" height="48" preserveAspectRatio="xMidYMid meet">
    <rect x="0" y="0" width="175" height="6" rx="2" fill="#d4af37"/>
  </svg>`;

const bagSilhouette = (shape) => {
  if (shape === "mini") {
    // 180 × 160 mm
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 160" width="900" height="800" preserveAspectRatio="xMidYMid meet">
      <path d="M 6 56 Q 90 0 174 56 L 168 150 Q 90 162 12 150 Z" fill="#7a4a2a"/>
      <rect x="76" y="84" width="28" height="14" rx="2" fill="#d4af37"/>
    </svg>`;
  }
  if (shape === "shoulder") {
    // 250 × 200 mm
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 200" width="1000" height="800" preserveAspectRatio="xMidYMid meet">
      <path d="M 8 30 L 242 30 L 226 196 Q 125 200 24 196 Z" fill="#7a4a2a"/>
      <path d="M 6 30 Q 125 -120 244 30" fill="none" stroke="#3a2615" stroke-width="5"/>
    </svg>`;
  }
  // tote 300 × 230 mm
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 230" width="1200" height="920" preserveAspectRatio="xMidYMid meet">
    <path d="M 8 36 L 292 36 L 280 226 L 20 226 Z" fill="#7a4a2a"/>
    <path d="M 80 36 Q 80 -34 110 -34 Q 140 -34 140 36" fill="none" stroke="#3a2615" stroke-width="6"/>
    <path d="M 160 36 Q 160 -34 190 -34 Q 220 -34 220 36" fill="none" stroke="#3a2615" stroke-width="6"/>
    <rect x="120" y="100" width="60" height="22" rx="2" fill="#3a2615"/>
    <rect x="142" y="116" width="16" height="20" rx="1" fill="#d4af37"/>
  </svg>`;
};

// ---------- Asset path convention ----------

const ASSET_BASE = "./assets/products";
const rasterUrl = (category, id, ext = "png") => `${ASSET_BASE}/${category}/${id}.${ext}`;

// ---------- Catalog ----------

const RAW = [
  // Watches
  {
    id: "watch-dive-40", name: "Round Steel Dive Watch", brand: "Generic Maison",
    category: "watch", anchor: "wrist", refMm: 55,
    dimensions: { widthMm: 40, heightMm: 48, depthMm: 13 },
    materials: ["904L stainless steel", "sapphire crystal", "ceramic bezel"],
    finish: "polished + brushed",
    asset: { url: rasterUrl("watches", "watch-dive-40"), format: "png", svgFallback: watchSilhouette("round") },
    renderHints: { rotationOffsetDeg: 90 },
  },
  {
    id: "watch-dress-28", name: "Square Gold Dress Watch", brand: "Generic Maison",
    category: "watch", anchor: "wrist", refMm: 55,
    dimensions: { widthMm: 28, heightMm: 36, depthMm: 8 },
    materials: ["18k yellow gold", "alligator strap"],
    finish: "polished",
    asset: { url: rasterUrl("watches", "watch-dress-28"), format: "png", svgFallback: watchSilhouette("square") },
    renderHints: { rotationOffsetDeg: 90 },
  },
  {
    id: "watch-chrono-42", name: "Round Steel Chronograph", brand: "Generic Maison",
    category: "watch", anchor: "wrist", refMm: 55,
    dimensions: { widthMm: 42, heightMm: 50, depthMm: 14 },
    materials: ["stainless steel", "sapphire crystal"],
    finish: "brushed",
    asset: { url: rasterUrl("watches", "watch-chrono-42"), format: "png", svgFallback: watchSilhouette("round") },
    renderHints: { rotationOffsetDeg: 90 },
  },
  // Rings
  {
    id: "ring-solitaire", name: "Solitaire Diamond Ring", brand: "Generic Atelier",
    category: "ring", anchor: "finger", refMm: 16,
    dimensions: { widthMm: 18, heightMm: 14 },
    materials: ["platinum", "diamond"],
    finish: "polished",
    asset: { url: rasterUrl("rings", "ring-solitaire"), format: "png", svgFallback: ringSilhouette },
    renderHints: { rotationOffsetDeg: 90 },
  },
  {
    id: "ring-eternity", name: "Eternity Band", brand: "Generic Atelier",
    category: "ring", anchor: "finger", refMm: 16,
    dimensions: { widthMm: 18, heightMm: 8 },
    materials: ["platinum", "diamonds"],
    finish: "polished",
    asset: { url: rasterUrl("rings", "ring-eternity"), format: "png", svgFallback: ringSilhouette },
    renderHints: { rotationOffsetDeg: 90 },
  },
  {
    id: "ring-signet", name: "Gold Signet Ring", brand: "Generic Atelier",
    category: "ring", anchor: "finger", refMm: 16,
    dimensions: { widthMm: 18, heightMm: 14 },
    materials: ["18k yellow gold"],
    finish: "polished",
    asset: { url: rasterUrl("rings", "ring-signet"), format: "png", svgFallback: ringSilhouette },
    renderHints: { rotationOffsetDeg: 90 },
  },
  // Bracelets
  {
    id: "bracelet-tennis", name: "Diamond Tennis Bracelet", brand: "Generic Atelier",
    category: "bracelet", anchor: "wrist", refMm: 55,
    dimensions: { widthMm: 175, heightMm: 6 },
    materials: ["18k white gold", "diamonds"],
    finish: "polished",
    asset: { url: rasterUrl("bracelets", "bracelet-tennis"), format: "png", svgFallback: braceletSilhouette },
  },
  {
    id: "bracelet-cuff", name: "Gold Cuff", brand: "Generic Atelier",
    category: "bracelet", anchor: "wrist", refMm: 55,
    dimensions: { widthMm: 170, heightMm: 18 },
    materials: ["18k yellow gold"],
    finish: "polished",
    asset: { url: rasterUrl("bracelets", "bracelet-cuff"), format: "png", svgFallback: braceletSilhouette },
  },
  {
    id: "bracelet-link", name: "Gold Link Bracelet", brand: "Generic Atelier",
    category: "bracelet", anchor: "wrist", refMm: 55,
    dimensions: { widthMm: 175, heightMm: 10 },
    materials: ["18k yellow gold"],
    finish: "polished",
    asset: { url: rasterUrl("bracelets", "bracelet-link"), format: "png", svgFallback: braceletSilhouette },
  },
  // Bags
  {
    id: "bag-tote-30", name: "Structured Top-Handle Tote", brand: "Generic Maison",
    category: "bag", anchor: "hand", refMm: 180,
    dimensions: { widthMm: 300, heightMm: 230, depthMm: 150 },
    materials: ["togo leather", "palladium hardware"],
    finish: "matte",
    asset: { url: rasterUrl("bags", "bag-tote-30"), format: "png", svgFallback: bagSilhouette("tote") },
  },
  {
    id: "bag-mini-18", name: "Mini Crossbody", brand: "Generic Maison",
    category: "bag", anchor: "hand", refMm: 180,
    dimensions: { widthMm: 180, heightMm: 160, depthMm: 80 },
    materials: ["box calf leather"],
    finish: "polished",
    asset: { url: rasterUrl("bags", "bag-mini-18"), format: "png", svgFallback: bagSilhouette("mini") },
  },
  {
    id: "bag-shoulder-25", name: "Soft Shoulder Bag", brand: "Generic Maison",
    category: "bag", anchor: "hand", refMm: 180,
    dimensions: { widthMm: 250, heightMm: 200, depthMm: 100 },
    materials: ["soft calfskin"],
    finish: "matte",
    asset: { url: rasterUrl("bags", "bag-shoulder-25"), format: "png", svgFallback: bagSilhouette("shoulder") },
  },
];

export const CATALOG_PROFILES = RAW.map(makeProfile);

export function profilesByCategory(category) {
  return CATALOG_PROFILES.filter(p => p.category === category);
}

export function profileById(id) {
  return CATALOG_PROFILES.find(p => p.id === id);
}
