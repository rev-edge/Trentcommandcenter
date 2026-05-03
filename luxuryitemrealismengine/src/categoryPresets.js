// Per-category render defaults. Each anchor type has a different real-world
// reference width and a different "looks right" baseline for shadow, lift,
// and perspective. These are the starting points the user can fine-tune.
//
// Lighting note: ambient color match defaults raised to 0.22 after V1 QA —
// the previous 0.10 default was effectively invisible on tinted scenes.
//
// Shadow note: previous V1 used independent X/Y shadow offsets. We now
// express the contact-shadow offset as a single "lightAngleDeg" (the
// direction *toward* the light source) and a contact distance/spread.

const COMMON_RENDER = {
  scale: 1,
  productOpacity: 1,
  ambientStrength: 0.22,
  featherPx: 1.4,             // slightly stronger feather; edge grain finishes the job
  // Directional shadow:
  lightAngleDeg: 135,         // light from upper-left → shadow falls lower-right
  contactShadow: 0.55,        // strongest at the touch line
  contactShadowBlur: 6,
  contactShadowDistance: 4,
  castShadow: 0.28,
  castShadowBlur: 28,
  castShadowDistance: 18,
  // Realism refinement defaults (added pass 2):
  contactDarken: 0.45,        // darker rim on shadow-side edge ("press into skin")
  directionalLight: 0.28,     // warm-side / cool-side gradient on the product
  edgeGrain: 0.18,            // photo blend along feathered edge to avoid PNG cut
  autoEdgeOcclude: true,      // auto-paint thin skin-edge halo each render
  autoEdgeTolerance: 0.16,
  autoEdgeReach: 16,
  // Body clip — clips the whole product layer to the body silhouette so the
  // strap "wraps behind" the wrist edge instead of continuing onto the table.
  bodyClip: true,
  bodyClipTolerance: 0.32,
  bodyClipCaseLift: 0.55,    // re-draw central-case region on top so the
                             // dial isn't holed by shadows / hair pixels
                             // that missed the body threshold.
  // Occlusion (manual paint mask)
  occlusionEnabled: true,
};

export const CATEGORY_PRESETS = {
  watch: {
    label: "Watches",
    anchor: "wrist",
    refMmDefault: 55,
    refMmRange: [40, 80],
    anchorHint: "Drag the two dots across the wrist (perpendicular to the arm) at the watch position.",
    render: {
      ...COMMON_RENDER,
      rotationDeg: 90,        // anchor crosses the wrist; watch sits perpendicular
      perspectiveDeg: 0,
      liftPx: 0,
    },
  },
  ring: {
    label: "Rings",
    anchor: "finger",
    refMmDefault: 16,
    refMmRange: [12, 22],
    anchorHint: "Drag the two dots across the base of the chosen finger, perpendicular to the finger.",
    render: {
      ...COMMON_RENDER,
      rotationDeg: 90,
      perspectiveDeg: 0,
      liftPx: 0,
      contactShadowBlur: 3,
      contactShadowDistance: 2,
      castShadowBlur: 12,
      castShadowDistance: 6,
      featherPx: 1.0,
      contactDarken: 0.22,
      autoEdgeReach: 8,
    },
  },
  bracelet: {
    label: "Bracelets",
    anchor: "wrist",                // FIXED: now across-wrist like watch
    refMmDefault: 55,               // wrist width reference
    refMmRange: [40, 80],
    anchorHint: "Drag the two dots across the wrist where the bracelet should rest. Same gesture as the watch.",
    render: {
      ...COMMON_RENDER,
      rotationDeg: 90,              // bracelet visible width sits across the wrist
      perspectiveDeg: 0,
      liftPx: 0,
      contactShadowBlur: 6,
      contactShadowDistance: 3,
      castShadowBlur: 22,
      castShadowDistance: 12,
    },
  },
  bag: {
    label: "Handbags",
    anchor: "hand",
    refMmDefault: 220,
    refMmRange: [120, 360],
    anchorHint: "Drag from the hand down to where the bag's bottom should sit. Defines size and angle.",
    render: {
      ...COMMON_RENDER,
      rotationDeg: 0,
      perspectiveDeg: 0,
      liftPx: 0,
      contactShadow: 0.35,
      contactShadowBlur: 14,
      contactShadowDistance: 8,
      castShadow: 0.32,
      castShadowBlur: 48,
      castShadowDistance: 32,
      ambientStrength: 0.25,
      featherPx: 1.8,
      contactDarken: 0.20,
      directionalLight: 0.14,
      autoEdgeOcclude: false,
      autoEdgeReach: 24,
      bodyClip: false,            // bags hang OFF the body intentionally
      bodyClipCaseLift: 0,
    },
  },
};

export function presetFor(category) {
  return CATEGORY_PRESETS[category] || CATEGORY_PRESETS.watch;
}

export function resolveRenderParams(profile) {
  const preset = presetFor(profile.category);
  return {
    refMm: profile.refMm ?? preset.refMmDefault,
    ...preset.render,
    ...(profile.renderHints || {}),
  };
}
