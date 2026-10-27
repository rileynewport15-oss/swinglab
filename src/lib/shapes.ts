// Shape data plus pure helper functions (no React here).
//
// Points are stored as fractions of the video size (0 to 1), not pixels.
// That way a drawing stays on the same spot of the golfer when the screen
// rotates or resizes. We convert to pixels only when drawing or hit testing.

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

export type ShapeKind = "line" | "freehand" | "circle" | "box" | "angle";

export type Shape = {
  id: string;
  kind: ShapeKind;
  color: string;
  // line/box: 2 points (ends / opposite corners)
  // circle: [center, point on the edge]
  // angle: [end A, vertex, end C] (fewer while it's being placed)
  // freehand: every point along the stroke
  points: Point[];
  label?: string;
  showTilt?: boolean; // lines only: show degrees away from vertical
};

export type Hit = { type: "handle"; index: number } | { type: "body" };

const LINE_WIDTH = 3;
const HANDLE_RADIUS = 9;
const HANDLE_HIT = 24; // finger-sized grab area, in CSS pixels
const BODY_HIT = 16;

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function toPx(p: Point, size: Size): Point {
  return { x: p.x * size.width, y: p.y * size.height };
}

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Distance from point p to the line segment a-b.
function distToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Angle at the vertex b between rays b→a and b→c, in degrees (0–180). */
export function angleDegrees(a: Point, b: Point, c: Point) {
  const a1 = Math.atan2(a.y - b.y, a.x - b.x);
  const a2 = Math.atan2(c.y - b.y, c.x - b.x);
  let deg = Math.abs(((a2 - a1) * 180) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
}

/** How far a line leans away from straight up and down, in degrees (0–90). */
export function tiltFromVertical(a: Point, b: Point) {
  return (Math.atan2(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 180) / Math.PI;
}

/** Which handles (drag points) a shape shows when selected. */
function handleIndexes(shape: Shape): number[] {
  if (shape.kind === "freehand") return [];
  return shape.points.map((_, i) => i);
}

/** Is a tap at `p` (pixels) on this shape? Handles win over the body. */
export function hitTest(shape: Shape, p: Point, size: Size): Hit | null {
  const pts = shape.points.map((q) => toPx(q, size));

  for (const i of handleIndexes(shape)) {
    if (dist(p, pts[i]) <= HANDLE_HIT) return { type: "handle", index: i };
  }

  switch (shape.kind) {
    case "line":
    case "angle":
    case "freehand":
      for (let i = 0; i < pts.length - 1; i++) {
        if (distToSegment(p, pts[i], pts[i + 1]) <= BODY_HIT) return { type: "body" };
      }
      return null;
    // Circles and boxes only count as hit near their outline, so a big shape
    // doesn't block taps on the shapes inside it.
    case "circle": {
      const r = dist(pts[0], pts[1]);
      return Math.abs(dist(p, pts[0]) - r) <= BODY_HIT ? { type: "body" } : null;
    }
    case "box": {
      const [a, b] = pts;
      const corners = [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }];
      for (let i = 0; i < 4; i++) {
        if (distToSegment(p, corners[i], corners[(i + 1) % 4]) <= BODY_HIT) return { type: "body" };
      }
      return null;
    }
  }
}

/** Draw one shape onto the canvas. */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  size: Size,
  selected: boolean,
) {
  const pts = shape.points.map((q) => toPx(q, size));
  if (pts.length === 0) return;

  ctx.save();
  ctx.strokeStyle = shape.color;
  ctx.fillStyle = shape.color;
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // A soft shadow keeps lines visible on both bright sky and dark grass.
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 3;

  ctx.beginPath();
  switch (shape.kind) {
    case "line":
    case "freehand":
    case "angle":
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
      break;
    case "circle":
      ctx.arc(pts[0].x, pts[0].y, dist(pts[0], pts[1]), 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "box":
      ctx.strokeRect(pts[0].x, pts[0].y, pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      break;
  }

  // Angle tool: dots on each placed point, plus an arc and the measurement.
  if (shape.kind === "angle") {
    for (const p of pts) dot(ctx, p, 5);
    if (pts.length === 3) {
      const [a, b, c] = pts;
      const deg = angleDegrees(a, b, c);
      const r = Math.min(30, dist(a, b) * 0.5, dist(c, b) * 0.5);
      const start = Math.atan2(a.y - b.y, a.x - b.x);
      const end = Math.atan2(c.y - b.y, c.x - b.x);
      let sweep = end - start;
      if (sweep > Math.PI) sweep -= Math.PI * 2;
      if (sweep < -Math.PI) sweep += Math.PI * 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, start, start + sweep, sweep < 0);
      ctx.stroke();
      // Put the number on the outside of the angle so it doesn't cover the lines.
      const mid = start + sweep / 2;
      label(ctx, `${Math.round(deg)}°`, {
        x: b.x - Math.cos(mid) * 30,
        y: b.y - Math.sin(mid) * 30,
      }, shape.color);
    }
  }

  // Text labels for preset aids, and tilt readout for the spine line.
  let text = shape.label ?? "";
  if (shape.kind === "line" && shape.showTilt && pts.length === 2) {
    text += `${text ? " " : ""}${Math.round(tiltFromVertical(pts[0], pts[1]))}°`;
  }
  if (text) {
    const anchor = shape.kind === "circle"
      ? { x: pts[0].x, y: pts[0].y - dist(pts[0], pts[1]) - 16 }
      : shape.kind === "box"
        ? { x: (pts[0].x + pts[1].x) / 2, y: Math.min(pts[0].y, pts[1].y) - 16 }
        : midpoint(pts[0], pts[pts.length - 1]);
    label(ctx, text, anchor, shape.color);
  }

  if (selected) {
    ctx.shadowBlur = 0;
    for (const i of handleIndexes(shape)) {
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = shape.color;
      ctx.stroke();
    }
    if (shape.kind === "freehand") {
      // Freehand has no handles; outline it with a dashed box instead.
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "white";
      ctx.strokeRect(
        Math.min(...xs) - 8,
        Math.min(...ys) - 8,
        Math.max(...xs) - Math.min(...xs) + 16,
        Math.max(...ys) - Math.min(...ys) + 16,
      );
    }
  }

  ctx.restore();
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function dot(ctx: CanvasRenderingContext2D, p: Point, r: number) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Small dark pill with white text, readable on any background.
function label(ctx: CanvasRenderingContext2D, text: string, at: Point, color: string) {
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.font = "600 13px system-ui, sans-serif";
  const w = ctx.measureText(text).width + 12;
  const h = 22;
  // Keep labels inside the canvas.
  const x = Math.max(2, Math.min(at.x - w / 2, ctx.canvas.clientWidth - w - 2));
  const y = Math.max(2, Math.min(at.y - h / 2, ctx.canvas.clientHeight - h - 2));
  ctx.fillStyle = "rgba(13,46,29,0.85)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "white";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 6, y + h / 2 + 1);
  ctx.restore();
}
