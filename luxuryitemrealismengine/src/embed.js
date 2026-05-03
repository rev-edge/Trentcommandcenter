// Retailer embed entry point. A retailer drops a single <div> into their page,
// then calls mountLuxuryTryOn(el, options) — same widget, no demo chrome.
//
// V1 stub: simply mounts the existing widget into the provided element by
// injecting the widget HTML scaffold first. Production: ship a built bundle
// + scoped CSS, lazy-load assets, accept a productProfile or productId
// from the retailer's catalog.

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
      <div class="lire-tabs" data-tabs></div>
      <div class="lire-products" data-products></div>
    </aside>
    <main class="lire-main">
      <div class="lire-empty" data-empty>Upload a photo to begin.</div>
      <canvas data-canvas></canvas>
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
  // Expose for visual-QA harnesses (and retailer integrations that want to
  // drive the widget programmatically). Safe to remove in a strict embed build.
  if (typeof window !== "undefined") window.luxuryTryOn = api;
  return api;
}
