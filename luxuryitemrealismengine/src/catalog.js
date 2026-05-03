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

const watchSilhouette = (style) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
    <rect x="120" y="80" width="60" height="80" rx="6" fill="#3b3f47"/>
    <rect x="120" y="240" width="60" height="80" rx="6" fill="#3b3f47"/>
    ${style === "square"
      ? `<rect x="105" y="155" width="90" height="90" rx="14" fill="#1a1d29" stroke="#9aa0aa" stroke-width="3"/>`
      : `<circle cx="150" cy="200" r="55" fill="#1a1d29" stroke="#9aa0aa" stroke-width="3"/>`}
  </svg>`;

const ringSilhouette = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
    <ellipse cx="150" cy="220" rx="80" ry="68" fill="none" stroke="#d4af37" stroke-width="14"/>
    <polygon points="150,130 168,150 158,168 142,168 132,150" fill="#eaf3ff" stroke="#ffffff" stroke-width="1"/>
  </svg>`;

const braceletSilhouette = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
    <rect x="20" y="190" width="260" height="22" rx="6" fill="#d4af37"/>
  </svg>`;

const bagSilhouette = (shape) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
    ${shape === "mini"
      ? `<path d="M 80 200 Q 150 130 220 200 L 210 290 Q 150 310 90 290 Z" fill="#7a4a2a"/>`
      : shape === "shoulder"
        ? `<path d="M 60 180 L 240 180 L 225 320 Q 150 340 75 320 Z" fill="#7a4a2a"/>`
        : `<path d="M 50 160 L 250 160 L 240 330 L 60 330 Z" fill="#7a4a2a"/>
           <path d="M 100 150 Q 100 90 130 90 Q 150 90 150 150" fill="none" stroke="#3a2615" stroke-width="6"/>
           <path d="M 150 150 Q 150 90 170 90 Q 200 90 200 150" fill="none" stroke="#3a2615" stroke-width="6"/>`}
  </svg>`;

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
