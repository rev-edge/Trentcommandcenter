// Two-point anchor placement. The user drags two handles to mark the body
// landmark (wrist, finger, hand). The line between the points encodes
// position (midpoint), rotation (angle), and scale (length vs. real-world ref).

const HANDLE_RADIUS = 12;

export class AnchorController {
  constructor(canvas, { onChange } = {}) {
    this.canvas = canvas;
    this.onChange = onChange || (() => {});
    this.points = null;
    this.dragging = null;
    canvas.addEventListener("pointerdown", this.handleDown);
    canvas.addEventListener("pointermove", this.handleMove);
    window.addEventListener("pointerup", this.handleUp);
  }

  setPoints(a, b) {
    this.points = [a, b];
    this.onChange(this.points);
  }

  reset() {
    this.points = null;
    this.onChange(null);
  }

  // Initialize anchors as a horizontal line across the photo center.
  autoPlace(width, height) {
    const cx = width / 2;
    const cy = height / 2;
    const span = Math.min(width, height) * 0.18;
    this.setPoints({ x: cx - span, y: cy }, { x: cx + span, y: cy });
  }

  toLocal(evt) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / rect.width;
    const sy = this.canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * sx,
      y: (evt.clientY - rect.top) * sy,
    };
  }

  hitTest(p) {
    if (!this.points) return -1;
    for (let i = 0; i < 2; i++) {
      const d = Math.hypot(p.x - this.points[i].x, p.y - this.points[i].y);
      if (d <= HANDLE_RADIUS * 2.5) return i;
    }
    return -1;
  }

  handleDown = (evt) => {
    if (!this.points) return;
    const p = this.toLocal(evt);
    const idx = this.hitTest(p);
    if (idx >= 0) {
      this.dragging = idx;
      this.canvas.setPointerCapture(evt.pointerId);
    }
  };

  handleMove = (evt) => {
    if (this.dragging === null || this.dragging === undefined) return;
    if (!this.points) return;
    const p = this.toLocal(evt);
    this.points[this.dragging] = p;
    this.onChange(this.points);
  };

  handleUp = () => {
    this.dragging = null;
  };

  drawHandles(ctx) {
    if (!this.points) return;
    const [a, b] = this.points;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const p of [a, b]) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(15, 17, 25, 0.85)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
    ctx.restore();
  }
}
