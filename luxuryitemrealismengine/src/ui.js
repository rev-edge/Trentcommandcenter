// UI bindings for the V1 widget. Single-screen layout: photo upload + category
// tabs + product grid + canvas viewport + adjustment controls.

import { CATEGORY_PRESETS, presetFor, resolveRenderParams } from "./categoryPresets.js";
import { profilesByCategory } from "./catalog.js";
import { Compositor } from "./compositor.js";
import { AnchorController } from "./anchors.js";
import { hasRasterAsset } from "./productProfile.js";

const CATEGORIES = ["watch", "ring", "bracelet", "bag"];

export function mountWidget(root) {
  const els = {
    root,
    upload: root.querySelector("[data-upload]"),
    fileInput: root.querySelector("[data-file]"),
    canvas: root.querySelector("[data-canvas]"),
    tabs: root.querySelector("[data-tabs]"),
    products: root.querySelector("[data-products]"),
    controls: root.querySelector("[data-controls]"),
    hint: root.querySelector("[data-hint]"),
    badge: root.querySelector("[data-asset-badge]"),
    exportBtn: root.querySelector("[data-export]"),
    resetBtn: root.querySelector("[data-reset]"),
    replaceAnchorsBtn: root.querySelector("[data-replace-anchors]"),
    productMeta: root.querySelector("[data-product-meta]"),
    emptyState: root.querySelector("[data-empty]"),
    stage: root.querySelector("[data-stage]"),
  };

  // Hide controls/actions until a product is selected so the right rail
  // doesn't show ghost rails in the empty state.
  els.controls.hidden = true;
  els.controls.parentElement.querySelector(".lire-actions").hidden = true;

  const state = {
    category: "watch",
    profile: null,
    params: null,
  };

  const compositor = new Compositor(els.canvas);
  const anchors = new AnchorController(els.canvas, { onChange: () => render() });

  function render() {
    if (!compositor.photoCanvas) return;
    compositor.render({ anchors: anchors.points, params: state.params });
    anchors.drawHandles(compositor.ctx);
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
      const dims = `${profile.dimensions.widthMm} × ${profile.dimensions.heightMm} mm`;
      card.innerHTML = `
        <div class="product-card-thumb"><img alt="" src="${profile.asset.url}"/></div>
        <div class="product-card-meta">
          <div class="product-card-name">${profile.name}</div>
          <div class="product-card-dim">${dims}</div>
        </div>`;
      const imgEl = card.querySelector("img");
      imgEl.onerror = () => {
        const ph = document.createElement("div");
        ph.className = "thumb-placeholder";
        ph.innerHTML = profile.asset.svgFallback;
        imgEl.replaceWith(ph);
      };
      card.addEventListener("click", () => selectProduct(profile));
      els.products.appendChild(card);
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
    if (!source) {
      els.badge.hidden = true;
      return;
    }
    els.badge.hidden = false;
    if (source === "raster") {
      els.badge.className = "asset-badge realism";
      els.badge.textContent = "HD raster · realism mode";
    } else {
      els.badge.className = "asset-badge fallback";
      els.badge.textContent = warning || "Placeholder asset";
    }
  }

  function updateProductMeta() {
    if (!state.profile) {
      els.productMeta.hidden = true;
      return;
    }
    const p = state.profile;
    els.productMeta.hidden = false;
    els.productMeta.innerHTML = `
      <div class="meta-row"><span class="meta-label">Brand</span><span>${p.brand || "—"}</span></div>
      <div class="meta-row"><span class="meta-label">Model</span><span>${p.model}</span></div>
      <div class="meta-row"><span class="meta-label">Dimensions</span><span>${p.dimensions.widthMm} × ${p.dimensions.heightMm}${p.dimensions.depthMm ? ` × ${p.dimensions.depthMm}` : ""} mm</span></div>
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
      { key: "contactShadow", label: "Contact shadow", min: 0, max: 1, step: 0.01 },
      { key: "contactShadowBlur", label: "Contact shadow blur", min: 0, max: 40, step: 1 },
      { key: "shadowOffsetX", label: "Shadow offset X", min: -30, max: 30, step: 1 },
      { key: "shadowOffsetY", label: "Shadow offset Y", min: -30, max: 30, step: 1 },
      { key: "ambientShadow", label: "Ambient shadow", min: 0, max: 0.6, step: 0.01 },
      { key: "ambientShadowBlur", label: "Ambient shadow blur", min: 0, max: 80, step: 1 },
      { key: "ambientStrength", label: "Color match", min: 0, max: 0.5, step: 0.01 },
      { key: "featherPx", label: "Edge feather", min: 0, max: 4, step: 0.1 },
    ];
    els.controls.innerHTML = "";
    for (const c of ctrls) {
      const wrap = document.createElement("label");
      wrap.className = "control";
      const value = state.params[c.key];
      wrap.innerHTML = `
        <span class="control-label"><span>${c.label}</span><span class="control-value">${formatVal(value)}</span></span>
        <input type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${value}" />
      `;
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

  async function loadPhoto(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    await compositor.setPhoto(img);
    els.emptyState.hidden = true;
    els.stage.classList.add("has-photo");
    anchors.autoPlace(els.canvas.width, els.canvas.height);
    render();
  }

  // Wire up file input + drag/drop
  els.fileInput.addEventListener("change", e => loadPhoto(e.target.files[0]));
  els.upload.addEventListener("click", () => els.fileInput.click());
  ["dragenter", "dragover"].forEach(t => els.upload.addEventListener(t, e => { e.preventDefault(); els.upload.classList.add("is-drop"); }));
  ["dragleave", "drop"].forEach(t => els.upload.addEventListener(t, e => { e.preventDefault(); els.upload.classList.remove("is-drop"); }));
  els.upload.addEventListener("drop", e => loadPhoto(e.dataTransfer.files[0]));

  els.exportBtn.addEventListener("click", () => {
    if (!compositor.photoCanvas) return;
    // Render a clean composite (no anchor handles) for export.
    compositor.render({ anchors: anchors.points, params: state.params });
    const url = compositor.exportPNG();
    // Restore the on-screen view with handles on top.
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
      render();
    }
  });

  els.replaceAnchorsBtn?.addEventListener("click", () => {
    if (compositor.photoCanvas) {
      anchors.autoPlace(els.canvas.width, els.canvas.height);
      render();
    }
  });

  // Initial render
  buildTabs();
  buildProducts();
  els.hint.textContent = CATEGORY_PRESETS[state.category].anchorHint;
  els.emptyState.hidden = false;

  return {
    selectProduct,
    loadPhoto,
    exportPNG: () => compositor.exportPNG(),
    setAnchors: (a, b) => { anchors.setPoints(a, b); render(); },
    getAnchors: () => anchors.points,
    setParam: (key, value) => { state.params[key] = value; buildControls(); render(); },
    getState: () => ({ category: state.category, profile: state.profile, params: state.params }),
  };
}
