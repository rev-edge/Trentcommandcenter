// Real luxury accessory catalog wired to the assets under
// assets/products/<category>/<id>.png (background pre-removed at asset prep).
// Each entry carries real-world dims, separated visual/circumference where
// applicable, and a `usability` flag so the QA harness skips assets that are
// detail-only (caseback, strap close-up, lifestyle shot, etc.).

import { makeProfile } from "./productProfile.js";

const ASSET_BASE = "./assets/products";
const url = (cat, id) => `${ASSET_BASE}/${cat}/${id}.png`;

const RAW = [
  // ---------- Watches ----------
  {
    id: "watch1", name: "Omega Seamaster Diver 300M (Green)",
    brand: "Omega", model: "Seamaster Diver 300M",
    category: "watch", anchor: "wrist", refMm: 55, usability: "hero",
    dimensions: { widthMm: 42, heightMm: 50, depthMm: 14, visualWidthMm: 42, visualHeightMm: 50 },
    materials: ["stainless steel", "ceramic bezel", "rubber strap"],
    finish: "polished + brushed",
    asset: { url: url("watches", "watch1"), format: "png", role: "hero" },
    renderHints: { rotationOffsetDeg: 90 },
  },
  {
    id: "watch2", name: "Omega Seamaster — strap detail",
    brand: "Omega", model: "Seamaster strap close-up",
    category: "watch", anchor: "wrist", refMm: 55, usability: "detail",
    dimensions: { widthMm: 22, heightMm: 80, visualWidthMm: 22, visualHeightMm: 80 },
    materials: ["rubber strap"],
    asset: { url: url("watches", "watch2"), format: "png", role: "detail" },
  },
  {
    id: "watch3", name: "Omega Seamaster — dial macro",
    brand: "Omega", model: "Dial close-up",
    category: "watch", anchor: "wrist", refMm: 55, usability: "detail",
    dimensions: { widthMm: 42, heightMm: 42, visualWidthMm: 42, visualHeightMm: 42 },
    materials: ["sapphire crystal"],
    asset: { url: url("watches", "watch3"), format: "png", role: "detail" },
  },
  {
    id: "watch4", name: "Omega Seamaster — caseback",
    brand: "Omega", model: "Caseback view",
    category: "watch", anchor: "wrist", refMm: 55, usability: "detail",
    dimensions: { widthMm: 42, heightMm: 50, visualWidthMm: 42, visualHeightMm: 50 },
    materials: ["stainless steel"],
    asset: { url: url("watches", "watch4"), format: "png", role: "detail" },
  },

  // ---------- Rings ----------
  {
    id: "ring1", name: "Solitaire Diamond Ring",
    brand: "Generic Atelier", model: "Round brilliant solitaire",
    category: "ring", anchor: "finger", refMm: 16, usability: "hero",
    dimensions: { widthMm: 14, heightMm: 14, visualWidthMm: 14, visualHeightMm: 14, circumferenceMm: 56 },
    materials: ["platinum", "diamond"],
    finish: "polished",
    asset: { url: url("rings", "ring1"), format: "png", role: "hero" },
    renderHints: { rotationOffsetDeg: 90 },
  },
  {
    id: "ring2", name: "Solitaire — side profile",
    brand: "Generic Atelier", model: "Side view",
    category: "ring", anchor: "finger", refMm: 16, usability: "detail",
    dimensions: { widthMm: 8, heightMm: 18, visualWidthMm: 8, visualHeightMm: 18 },
    materials: ["platinum"],
    asset: { url: url("rings", "ring2"), format: "png", role: "detail" },
  },
  {
    id: "ring3", name: "Solitaire Ring (front, full band)",
    brand: "Generic Atelier", model: "Front-on with band",
    category: "ring", anchor: "finger", refMm: 16, usability: "hero",
    dimensions: { widthMm: 16, heightMm: 18, visualWidthMm: 16, visualHeightMm: 18, circumferenceMm: 56 },
    materials: ["platinum", "diamond"],
    finish: "polished",
    asset: { url: url("rings", "ring3"), format: "png", role: "hero" },
    renderHints: { rotationOffsetDeg: 90 },
  },

  // ---------- Bracelets ----------
  // visualWidthMm = ~wrist diameter (55mm) since these are wrap-around items;
  // circumferenceMm = unrolled length (real product spec).
  {
    id: "bracelet1", name: "Mother-of-Pearl Motif Bracelet",
    brand: "Generic Atelier", model: "5-motif gold + MoP",
    category: "bracelet", anchor: "wrist", refMm: 55, usability: "hero",
    dimensions: { widthMm: 55, heightMm: 16, visualWidthMm: 55, visualHeightMm: 16, circumferenceMm: 175 },
    materials: ["18k yellow gold", "mother of pearl"],
    finish: "polished",
    asset: { url: url("bracelets", "bracelet1"), format: "png", role: "hero" },
  },
  {
    id: "bracelet2", name: "Mother-of-Pearl Motif Bracelet (curved)",
    brand: "Generic Atelier", model: "5-motif gold + MoP",
    category: "bracelet", anchor: "wrist", refMm: 55, usability: "hero",
    dimensions: { widthMm: 55, heightMm: 16, visualWidthMm: 55, visualHeightMm: 16, circumferenceMm: 175 },
    materials: ["18k yellow gold", "mother of pearl"],
    finish: "polished",
    asset: { url: url("bracelets", "bracelet2"), format: "png", role: "hero" },
  },
  {
    id: "bracelet3", name: "MoP motif — partial",
    brand: "Generic Atelier", model: "Single motif segment",
    category: "bracelet", anchor: "wrist", refMm: 55, usability: "detail",
    dimensions: { widthMm: 18, heightMm: 16, visualWidthMm: 18, visualHeightMm: 16 },
    materials: ["18k yellow gold", "mother of pearl"],
    asset: { url: url("bracelets", "bracelet3"), format: "png", role: "detail" },
  },

  // ---------- Bags ----------
  {
    id: "bag1", name: "Garden Tote (front)",
    brand: "Generic Maison", model: "Garden Party 30 — front",
    category: "bag", anchor: "hand", refMm: 220, usability: "hero",
    dimensions: { widthMm: 300, heightMm: 220, depthMm: 150, visualWidthMm: 300, visualHeightMm: 220 },
    materials: ["togo leather"],
    finish: "matte",
    asset: { url: url("bags", "bag1"), format: "png", role: "hero" },
  },
  {
    id: "bag2", name: "Garden Tote (3/4)",
    brand: "Generic Maison", model: "Garden Party 30 — angled",
    category: "bag", anchor: "hand", refMm: 220, usability: "hero",
    dimensions: { widthMm: 300, heightMm: 220, depthMm: 150, visualWidthMm: 300, visualHeightMm: 220 },
    materials: ["togo leather"],
    finish: "matte",
    asset: { url: url("bags", "bag2"), format: "png", role: "hero" },
  },
  {
    id: "bag3", name: "Lifestyle: model + bag",
    brand: "Generic Maison", model: "Lifestyle composite",
    category: "bag", anchor: "hand", refMm: 220, usability: "detail",
    dimensions: { widthMm: 1700, heightMm: 2000, visualWidthMm: 1700, visualHeightMm: 2000 },
    asset: { url: url("bags", "bag3"), format: "png", role: "detail" },
  },
];

export const CATALOG_PROFILES = RAW.map(makeProfile);

export function profilesByCategory(category, { includeDetail = true } = {}) {
  return CATALOG_PROFILES.filter(p =>
    p.category === category && (includeDetail || p.usability === "hero"),
  );
}

export function profileById(id) {
  return CATALOG_PROFILES.find(p => p.id === id);
}

export const HERO_PROFILES = CATALOG_PROFILES.filter(p => p.usability === "hero");
