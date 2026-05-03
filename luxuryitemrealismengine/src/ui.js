// UI bindings for the V1 widget. Single-screen layout with:
//   - Photo upload + sample-photo picker (real body images for QA)
//   - Category tabs + product cards
//   - Canvas viewport (anchors + occlusion painting share the canvas via tools)
//   - Tools: Move (anchor drag) / Paint mask / Erase mask / Auto-occlude
//   - Preview-mode toggle (hide all overlays for clean inspection)
//   - Adjustment controls panel
//   - Reset / Re-place anchors / Clear mask / Export PNG

import { CATEGORY_PRESETS, presetFor, resolveRenderParams } from "./categoryPresets.js";
import { profilesByCategory } from "./catalog.js";
import { Compositor } from "./compositor.js";
import { AnchorController } from "./anchors.js";
import { OcclusionController } from "./occlusion.js";

const CATEGORIES = ["watch", "ring", "bracelet", "bag"];

// Body images shipped under assets/sample-photos/. The picker lets the user
// (or the QA harness) load any of them with one click.
export const SAMPLE_PHOTOS = [
  { id: "wristtopdown",   label: "Wrist · top-down",   url: "./assets/sample-photos/wristtopdown.jpg",   for: ["watch", "bracelet"] },
  { id: "wristside",      label: "Wrist · side",       url: "./assets/sample-photos/wristside.jpg",      for: ["watch", "bracelet"] },
  { id: "wristbottomup",  label: "Wrist · bottom-up",  url: "./assets/sample-photos/wristbottomup.jpg",  for: ["watch", "bracelet"] },
  { id: "handtopdown",    label: "Hand · top-down",    url: "./assets/sample-photos/handtopdown.jpg",    for: ["ring", "bag"] },
  { id: "handside",       label: "Hand · side",        url: "./assets/sample-photos/handside.jpg",       for: ["ring", "bag"] },
  { id: "handbottomup",   label: "Hand · bottom-up",   url: "./assets/sample-photos/handbottomup.jpg",   for: ["ring", "bag"] },
  { id: "upperbodyleft",  label: "Upper body · left",  url: "./assets/sample-photos/upperbodyleft.jpg",  for: ["bag"] },
  { id: "upperbodycenter",label: "Upper body · center",url: "./assets/sample-photos/upperbodycenter.jpg",for: ["bag"] },
  { id: "upperbodyright", label: "Upper body · right", url: "./assets/sample-photos/upperbodyright.jpg", for: ["bag"] },
];

export function mountWidget(root) {
  const els = {
    root,
    upload: root.querySelector("[data-upload]"),
    fileInput: root.querySelector("[data-file]"),
    samples: root.querySelector("[data-samples]"),
    canvas: root.querySelector("[data-canvas]"),
    tabs: root.querySelector("[data-tabs]"),
    products: root.querySelector("[data-products]"),
    controls: root.querySelector("[data-controls]"),
    hint: root.querySelector("[data-hint]"),
    badge: root.querySelector("[data-asset-badge]"),
    tools: root.querySelector("[data-tools]"),
    brushSize: root.querySelector("[data-brush-size]"),
    previewToggle: root.querySelector("[data-preview]"),
    exportBtn: root.querySelector("[data-export]"),
    resetBtn: root.querySelector("[data-reset]"),
    replaceAnchorsBtn: root.querySelector("[data-replace-anchors]"),
    clearMaskBtn: root.querySelector("[data-clear-mask]"),
    autoOccludeBtn: root.querySelector("[data-auto-occlude]"),
    productMeta: root.querySelector("[data-product-meta]"),
    emptyState: root.querySelector("[data-empty]"),
    stage: root.querySelector("[data-stage]"),
  };

  els.controls.hidden = true;
  els.controls.parentElement.querySelector(".lire-actions").hidden = true;

  const state = {
    category: "watch",
    profile: null,
    params: null,
    tool: "move",        // "move" | "paint" | "erase"
    brushPx: 32,
    preview: false,
  };

  const compositor = new Compositor(els.canvas);
  const anchors = new AnchorController(els.canvas, { onChange: () => render() });
  const occCtl = new OcclusionController(els.canvas, compositor.occlusion, {
    onChange: () => render(),
    getBrushRadius: () => state.brushPx,
    getMode: () => (state.tool === "paint" ? "paint" : state.tool === "erase" ? "erase" : "off"),
  });
  occCtl.enable();

  function render() {
    if (!compositor.photoCanvas) return;
    compositor.render({ anchors: anchors.points, params: state.params });
    if (!state.preview) anchors.drawHandles(compositor.ctx);
    updateChromeForPreview();
  }

  function updateChromeForPreview() {
    els.hint.style.opacity = state.preview ? "0" : "";
    els.badge.style.opacity = state.preview ? "0" : "";
    els.tools.style.opacity = state.preview ? "0.2" : "";
  }

  function buildTabs() {
    els.tabs.innerHTML = "";
    for (const cat of CATEGORIES) {
      const btn = document.createElement("button");
      btn.className = "tab" + (cat === state.category ? " is-active" : "");
      btn.textContent = CATEGORY_PRESETS[cat].label;
      btn.addEventListener("click", () => {
        state.category = cat;
        buildTabs();
        buildProducts();
        buildSamples();
        els.hint.textContent = CATEGORY_PRESETS[cat].anchorHint;
      });
      els.tabs.appendChild(btn);
    }
  }

  function buildProducts() {
    els.products.innerHTML = "";
    for (const profile of profilesByCategory(state.category)) {
      const card = document.createElement("button");
      card.className = "product-card" + (state.profile?.id === profile.id ? " is-active" : "");
      if (profile.usability === "detail") card.classList.add("is-detail");
      const dims = `${profile.dimensions.widthMm} × ${profile.dimensions.heightMm} mm`;
      card.innerHTML = `
        <div class="product-card-thumb"><img alt="" src="${profile.asset.url}"/></div>
        <div class="product-card-meta">
          <div class="product-card-name">${profile.name}</div>
          <div class="product-card-dim">${dims}</div>
          ${profile.usability === "detail" ? '<div class="product-card-flag">detail-only</div>' : ""}
        </div>`;
      card.addEventListener("click", () => selectProduct(profile));
      els.products.appendChild(card);
    }
  }

  function buildSamples() {
    els.samples.innerHTML = "";
    const compatible = SAMPLE_PHOTOS.filter(s => s.for.includes(state.category));
    for (const s of compatible) {
      const btn = document.createElement("button");
      btn.className = "sample-pill";
      btn.textContent = s.label;
      btn.addEventListener("click", () => loadSampleByUrl(s.url));
      els.samples.appendChild(btn);
    }
  }

  async function selectProduct(profile) {
    state.profile = profile;
    state.params = resolveRenderParams(profile);
    buildProducts();
    buildControls();
    updateProductMeta();
    els.controls.hidden = false;
    els.controls.parentElement.querySelector(".lire-actions").hidden = false;
    const { source, warning } = await compositor.setProduct(profile);
    updateAssetBadge(source, warning);
    if (compositor.photoCanvas && !anchors.points) {
      anchors.autoPlace(els.canvas.width, els.canvas.height);
    }
    render();
  }

  function updateAssetBadge(source, warning) {
    if (!source) { els.badge.hidden = true; return; }
    els.badge.hidden = false;
    if (source === "raster") {
      els.badge.className = "lire-asset-badge asset-badge realism";
      els.badge.textContent = "HD raster · realism mode";
    } else {
      els.badge.className = "lire-asset-badge asset-badge fallback";
      els.badge.textContent = warning || "Placeholder asset";
    }
  }

  function updateProductMeta() {
    if (!state.profile) { els.productMeta.hidden = true; return; }
    const p = state.profile;
    els.productMeta.hidden = false;
    const circ = p.dimensions.circumferenceMm ? `<div class="meta-row"><span class="meta-label">Circumference</span><span>${p.dimensions.circumferenceMm} mm</span></div>` : "";
    els.productMeta.innerHTML = `
      <div class="meta-row"><span class="meta-label">Brand</span><span>${p.brand || "—"}</span></div>
      <div class="meta-row"><span class="meta-label">Model</span><span>${p.model}</span></div>
      <div class="meta-row"><span class="meta-label">Visual size</span><span>${p.dimensions.visualWidthMm ?? p.dimensions.widthMm} × ${p.dimensions.visualHeightMm ?? p.dimensions.heightMm} mm</span></div>
      ${circ}
      <div class="meta-row"><span class="meta-label">Materials</span><span>${(p.materials || []).join(", ") || "—"}</span></div>
      <div class="meta-row"><span class="meta-label">Finish</span><span>${p.finish || "—"}</span></div>
    `;
  }

  function buildControls() {
    const preset = presetFor(state.category);
    const ctrls = [
      { key: "refMm", label: `Reference (${preset.anchor}) mm`, min: preset.refMmRange[0], max: preset.refMmRange[1], step: 0.5 },
      { key: "scale", label: "Scale fine-tune", min: 0.5, max: 1.6, step: 0.01 },
      { key: "rotationDeg", label: "Rotation°", min: -180, max: 180, step: 1 },
      { key: "perspectiveDeg", label: "Perspective tilt°", min: -25, max: 25, step: 0.5 },
      { key: "liftPx", label: "Lift (perpendicular px)", min: -60, max: 60, step: 1 },
      { key: "productOpacity", label: "Product opacity", min: 0.4, max: 1, step: 0.01 },
      { key: "lightAngleDeg", label: "Light angle°", min: 0, max: 360, step: 1 },
      { key: "contactShadow", label: "Contact shadow", min: 0, max: 1, step: 0.01 },
      { key: "contactShadowBlur", label: "Contact blur", min: 0, max: 30, step: 1 },
      { key: "contactShadowDistance", label: "Contact distance", min: 0, max: 30, step: 0.5 },
      { key: "castShadow", label: "Cast shadow", min: 0, max: 0.6, step: 0.01 },
      { key: "castShadowBlur", label: "Cast blur", min: 0, max: 80, step: 1 },
      { key: "castShadowDistance", label: "Cast distance", min: 0, max: 80, step: 1 },
      { key: "ambientStrength", label: "Color match", min: 0, max: 0.6, step: 0.01 },
      { key: "featherPx", label: "Edge feather", min: 0, max: 4, step: 0.1 },
    ];
    els.controls.innerHTML = "";
    for (const c of ctrls) {
      const wrap = document.createElement("label");
      wrap.className = "control";
      const value = state.params[c.key];
      wrap.innerHTML = `
        <span class="control-label"><span>${c.label}</span><span class="control-value">${formatVal(value)}</span></span>
        <input type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${value}" />`;
      const input = wrap.querySelector("input");
      const valEl = wrap.querySelector(".control-value");
      input.addEventListener("input", () => {
        const v = parseFloat(input.value);
        state.params[c.key] = v;
        valEl.textContent = formatVal(v);
        render();
      });
      els.controls.appendChild(wrap);
    }
  }

  function formatVal(v) {
    if (typeof v !== "number") return "";
    if (Math.abs(v) >= 100) return v.toFixed(0);
    if (Math.abs(v) >= 10) return v.toFixed(1);
    return v.toFixed(2);
  }

  async function loadPhotoFromImage(img) {
    await compositor.setPhoto(img);
    els.emptyState.hidden = true;
    els.stage.classList.add("has-photo");
    anchors.autoPlace(els.canvas.width, els.canvas.height);
    render();
  }

  async function loadPhotoFromFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    await loadPhotoFromImage(img);
  }

  async function loadSampleByUrl(url) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    await loadPhotoFromImage(img);
  }

  // Tools
  function setTool(t) {
    state.tool = t;
    els.tools.querySelectorAll(".tool").forEach(b => b.classList.toggle("is-active", b.dataset.tool === t));
    els.canvas.style.cursor = t === "paint" || t === "erase" ? "crosshair" : "";
  }

  els.tools.querySelectorAll(".tool").forEach(b => b.addEventListener("click", () => setTool(b.dataset.tool)));
  els.brushSize.addEventListener("input", () => {
    state.brushPx = parseInt(els.brushSize.value, 10);
  });

  els.previewToggle.addEventListener("click", () => {
    state.preview = !state.preview;
    els.previewToggle.classList.toggle("is-active", state.preview);
    render();
  });

  // File handling
  els.fileInput.addEventListener("change", e => loadPhotoFromFile(e.target.files[0]));
  els.upload.addEventListener("click", () => els.fileInput.click());
  ["dragenter", "dragover"].forEach(t => els.upload.addEventListener(t, e => { e.preventDefault(); els.upload.classList.add("is-drop"); }));
  ["dragleave", "drop"].forEach(t => els.upload.addEventListener(t, e => { e.preventDefault(); els.upload.classList.remove("is-drop"); }));
  els.upload.addEventListener("drop", e => loadPhotoFromFile(e.dataTransfer.files[0]));

  els.exportBtn.addEventListener("click", () => {
    if (!compositor.photoCanvas) return;
    const wasPreview = state.preview;
    state.preview = true;
    compositor.render({ anchors: anchors.points, params: state.params });
    const url = compositor.exportPNG();
    state.preview = wasPreview;
    render();
    const a = document.createElement("a");
    a.href = url;
    a.download = `tryon-${state.profile?.id || "photo"}.png`;
    a.click();
  });

  els.resetBtn.addEventListener("click", () => {
    if (state.profile) {
      state.params = resolveRenderParams(state.profile);
      buildControls();
      anchors.autoPlace(els.canvas.width, els.canvas.height);
      compositor.occlusion.clear();
      render();
    }
  });

  els.replaceAnchorsBtn?.addEventListener("click", () => {
    if (compositor.photoCanvas) {
      anchors.autoPlace(els.canvas.width, els.canvas.height);
      render();
    }
  });

  els.clearMaskBtn?.addEventListener("click", () => {
    compositor.occlusion.clear();
    render();
  });

  els.autoOccludeBtn?.addEventListener("click", () => {
    if (!compositor.photoCanvas || !anchors.points) return;
    const tone = compositor.sceneSkinTone(anchors.points);
    if (!tone) return;
    // Restrict the auto-mask to a generous bounding box around the product
    // so we don't fill the entire scene with skin pixels.
    const c = els.canvas;
    const cx = (anchors.points[0].x + anchors.points[1].x) / 2;
    const cy = (anchors.points[0].y + anchors.points[1].y) / 2;
    const reach = Math.max(c.width, c.height) * 0.45;
    const bbox = {
      x: Math.max(0, Math.floor(cx - reach)),
      y: Math.max(0, Math.floor(cy - reach)),
      w: Math.min(c.width, Math.ceil(reach * 2)),
      h: Math.min(c.height, Math.ceil(reach * 2)),
    };
    bbox.w = Math.min(bbox.w, c.width - bbox.x);
    bbox.h = Math.min(bbox.h, c.height - bbox.y);
    compositor.occlusion.autoFromSkin(compositor.photoCanvas, tone, { bbox, tolerance: 0.18 });
    render();
  });

  buildTabs();
  buildProducts();
  buildSamples();
  setTool("move");
  els.hint.textContent = CATEGORY_PRESETS[state.category].anchorHint;
  els.emptyState.hidden = false;

  return {
    selectProduct,
    loadPhotoFromUrl: loadSampleByUrl,
    loadPhotoFromFile,
    exportPNG: () => compositor.exportPNG(),
    setAnchors: (a, b) => { anchors.setPoints(a, b); render(); },
    getAnchors: () => anchors.points,
    setParam: (key, value) => { state.params[key] = value; buildControls(); render(); },
    setPreview: (v) => { state.preview = !!v; render(); },
    paintMask: (cmds) => {
      // cmds: [{x, y, r}, ...] — useful for QA harnesses to seed an occlusion mask.
      for (const c of cmds) compositor.occlusion.paint(c.x, c.y, c.r ?? state.brushPx, c.opacity ?? 1);
      render();
    },
    autoOcclude: () => els.autoOccludeBtn?.click(),
    clearMask: () => { compositor.occlusion.clear(); render(); },
    getState: () => ({ category: state.category, profile: state.profile, params: state.params }),
    renderClean: () => {
      compositor.render({ anchors: anchors.points, params: state.params });
      return compositor.exportPNG();
    },
  };
}
