// Retailer embed entry point. The host page provides one element; we render
// the full widget into it. No dependencies on the demo chrome.

import { mountWidget } from "./ui.js";

const WIDGET_HTML = `
  <div class="lire-widget" data-stage>
    <aside class="lire-side">
      <div class="lire-upload" data-upload>
        <input type="file" accept="image/*" data-file hidden/>
        <div class="lire-upload-inner">
          <div class="lire-upload-title">Upload your photo</div>
          <div class="lire-upload-sub">Drag &amp; drop or click</div>
        </div>
      </div>
      <div class="lire-samples" data-samples></div>
      <div class="lire-tabs" data-tabs></div>
      <div class="lire-products" data-products></div>
    </aside>
    <main class="lire-main">
      <div class="lire-empty" data-empty>Upload a photo to begin.</div>
      <canvas data-canvas></canvas>
      <div class="lire-tools" data-tools>
        <button class="tool" data-tool="move" title="Move anchors">↔ Anchors</button>
        <button class="tool" data-tool="paint" title="Paint occlusion mask">⚫ Paint</button>
        <button class="tool" data-tool="erase" title="Erase mask">○ Erase</button>
        <label class="tool brush">
          <span>Brush</span>
          <input type="range" min="6" max="180" step="1" value="32" data-brush-size/>
        </label>
        <button class="tool" data-auto-occlude title="Auto-detect skin near anchor">⚡ Auto-occlude</button>
        <button class="tool" data-clear-mask title="Clear mask">⌫ Mask</button>
        <button class="tool preview-toggle" data-preview title="Hide overlays for clean inspection">◐ Preview</button>
      </div>
      <div class="lire-hint" data-hint></div>
      <div class="lire-asset-badge" data-asset-badge hidden></div>
    </main>
    <aside class="lire-controls-pane">
      <div class="lire-product-meta" data-product-meta hidden></div>
      <div class="lire-controls" data-controls></div>
      <div class="lire-actions">
        <button data-replace-anchors>Re-place anchors</button>
        <button data-reset>Reset</button>
        <button data-export class="primary">Export PNG</button>
      </div>
    </aside>
  </div>
`;

export function mountLuxuryTryOn(host, options = {}) {
  if (!host) throw new Error("mountLuxuryTryOn: missing host element");
  host.innerHTML = WIDGET_HTML;
  const api = mountWidget(host);
  if (typeof window !== "undefined") window.luxuryTryOn = api;
  return api;
}
