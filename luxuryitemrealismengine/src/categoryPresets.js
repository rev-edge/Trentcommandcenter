// Per-category render defaults. Each anchor type has a different
// real-world reference width and a different "looks right" baseline for
// shadow, lift, and perspective. These are the starting points the user
// can fine-tune via the controls panel.

export const CATEGORY_PRESETS = {
  watch: {
    label: "Watches",
    anchor: "wrist",
    refMmDefault: 55,        // average wrist width across the dial axis
    refMmRange: [40, 80],
    anchorHint: "Drag the two dots to the inner and outer edges of the wrist where the watch sits.",
    render: {
      scale: 1,
      rotationDeg: 90,        // anchor line is across wrist; watch sits perpendicular
      perspectiveDeg: 0,
      liftPx: 0,
      productOpacity: 1,
      contactShadow: 0.5,
      contactShadowBlur: 10,
      shadowOffsetX: 2,
      shadowOffsetY: 6,
      ambientShadow: 0.18,
      ambientShadowBlur: 26,
      ambientStrength: 0.12,
      featherPx: 1.2,
    },
  },
  ring: {
    label: "Rings",
    anchor: "finger",
    refMmDefault: 16,         // average ring-finger base width
    refMmRange: [12, 22],
    anchorHint: "Drag the two dots across the base of the chosen finger, perpendicular to the finger.",
    render: {
      scale: 1,
      rotationDeg: 90,
      perspectiveDeg: 0,
      liftPx: 0,
      productOpacity: 1,
      contactShadow: 0.45,
      contactShadowBlur: 6,
      shadowOffsetX: 1,
      shadowOffsetY: 3,
      ambientShadow: 0.12,
      ambientShadowBlur: 14,
      ambientStrength: 0.1,
      featherPx: 0.9,
    },
  },
  bracelet: {
    label: "Bracelets",
    anchor: "wrist",
    refMmDefault: 55,
    refMmRange: [40, 80],
    anchorHint: "Drag the two dots along the wrist where the bracelet should rest.",
    render: {
      scale: 1,
      rotationDeg: 0,         // bracelet wraps along the anchor line
      perspectiveDeg: 6,
      liftPx: 0,
      productOpacity: 1,
      contactShadow: 0.45,
      contactShadowBlur: 8,
      shadowOffsetX: 2,
      shadowOffsetY: 5,
      ambientShadow: 0.16,
      ambientShadowBlur: 22,
      ambientStrength: 0.12,
      featherPx: 1.0,
    },
  },
  bag: {
    label: "Handbags",
    anchor: "hand",
    refMmDefault: 180,        // typical hand-to-bag-bottom span
    refMmRange: [120, 320],
    anchorHint: "Drag from the hand down to where the bag's bottom should sit. Defines size and angle.",
    render: {
      scale: 1,
      rotationDeg: 0,
      perspectiveDeg: 0,
      liftPx: 0,
      productOpacity: 1,
      contactShadow: 0.4,
      contactShadowBlur: 18,
      shadowOffsetX: 4,
      shadowOffsetY: 14,
      ambientShadow: 0.22,
      ambientShadowBlur: 40,
      ambientStrength: 0.14,
      featherPx: 1.6,
    },
  },
};

export function presetFor(category) {
  return CATEGORY_PRESETS[category] || CATEGORY_PRESETS.watch;
}

// Merge preset render defaults with any per-product hints.
export function resolveRenderParams(profile) {
  const preset = presetFor(profile.category);
  return {
    refMm: profile.refMm ?? preset.refMmDefault,
    ...preset.render,
    ...(profile.renderHints || {}),
  };
}
