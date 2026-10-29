// Shape data plus pure helper functions (no React here).
//
// Points are stored in video coordinates: fractions of the video's width and
// height (0 to 1), not screen pixels. A drawing stays on the same spot of the
// golfer when the window resizes or the phone rotates. We convert to pixels
// only when drawing or hit testing.

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type ShapeKind = "line" | "freehand" | "circle" | "box" | "angle";

// Which automatic training aid a shape is (used to highlight it from results).
// Full swing: head, spine, stance, hips, plane. Putting: the rest (shoulders,
// triangle and handPath move with the golfer, so they're drawn by PuttOverlay
// rather than stored as shapes).
export type AidKind =
  | "head"
  | "spine"
  | "stance"
  | "hips"
  | "plane"
  | "puttHead"
  | "lowerBody"
  | "shoulders"
  | "triangle"
  | "strokeLength"
  | "handPath"
  | "eyeLine";

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
  labelAt?: Point; // where the user dragged the label's center (video coordinates)
  showTilt?: boolean; // lines only: show degrees away from vertical
  auto?: boolean; // placed automatically from pose detection
  aid?: AidKind;
};

export type Hit = { type: "handle"; index: number } | { type: "label" } | { type: "body" };

// Where a label is drawn, worked out for all labels together (see labels.ts).
export type LabelLayout = {
  text: string;
  rect: Rect;
  connector: { from: Point; to: Point } | null; // thin line back to the aid
};

const LINE_WIDTH = 3;
const HANDLE_RADIUS = 11; // drawn size of a selected shape's handle
const HANDLE_HIT = 24; // grab radius → 48px target, above the 44px touch minimum
const BODY_HIT = 14;
const LABEL_FONT = "600 13px system-ui, sans-serif";
export const LABEL_HEIGHT = 24;
const LABEL_PADDING = 8;

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function toPx(p: Point, size: Size): Point {
  return { x: p.x * size.width, y: p.y * size.height };
}

export function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(v, max));
}

// Distance from point p to the line segment a-b.
export function distToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq, 0, 1);
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

/** Which handles (drag points) a shape has. */
function handleIndexes(shape: Shape): number[] {
  if (shape.kind === "freehand") return [];
  // A circle has one handle in the middle (move); drag its outline to resize.
  if (shape.kind === "circle") return [0];
  return shape.points.map((_, i) => i);
}

// ---------- Labels ----------

let measureCtx: CanvasRenderingContext2D | null = null;
export function labelWidth(text: string) {
  return textWidth(text) + LABEL_PADDING * 2;
}

function textWidth(text: string) {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * 8;
  measureCtx.font = LABEL_FONT;
  return measureCtx.measureText(text).width;
}

/** The text shown on a shape's label, e.g. "Spine 32°". Empty if none. */
export function labelText(shape: Shape, size: Size) {
  let text = shape.label ?? "";
  if (shape.kind === "line" && shape.showTilt && shape.points.length === 2) {
    const [a, b] = shape.points.map((p) => toPx(p, size));
    text += `${text ? " " : ""}${Math.round(tiltFromVertical(a, b))}°`;
  }
  return text;
}

/** Pixel bounding box of a shape (used to place its delete button). */
export function shapeBounds(shape: Shape, size: Size): Rect {
  const pts = shape.points.map((q) => toPx(q, size));
  if (shape.kind === "circle" && pts.length === 2) {
    const r = dist(pts[0], pts[1]);
    return { x: pts[0].x - r, y: pts[0].y - r, w: r * 2, h: r * 2 };
  }
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

// ---------- Hit testing ----------

/**
 * Is a pointer at `p` (pixels) on this shape? Handles win, then the label
 * (if shown), then the body.
 */
export function hitTest(shape: Shape, p: Point, size: Size, label?: LabelLayout | null): Hit | null {
  const pts = shape.points.map((q) => toPx(q, size));

  // Circles: the inner part grabs the center handle (move), a band around the
  // outline resizes. Splitting by distance keeps both usable on small circles.
  if (shape.kind === "circle") {
    const d = dist(p, pts[0]);
    const r = dist(pts[0], pts[1]);
    if (d <= Math.max(8, Math.min(HANDLE_HIT, r - 8))) return { type: "handle", index: 0 };
    if (Math.abs(d - r) <= BODY_HIT) return { type: "body" };
  }

  // Pick the nearest handle in reach.
  let nearest: { index: number; d: number } | null = null;
  for (const i of handleIndexes(shape)) {
    const d = dist(p, pts[i]);
    if (d <= HANDLE_HIT && (!nearest || d < nearest.d)) nearest = { index: i, d };
  }
  if (nearest) return { type: "handle", index: nearest.index };

  if (
    label &&
    p.x >= label.rect.x - 4 &&
    p.x <= label.rect.x + label.rect.w + 4 &&
    p.y >= label.rect.y - 4 &&
    p.y <= label.rect.y + label.rect.h + 4
  ) {
    return { type: "label" };
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
    // doesn't block clicks on the shapes inside it.
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

// ---------- Drawing ----------

type DrawOptions = {
  selected: boolean;
  showHandles: boolean; // small dots on every shape so users know what's draggable
  highlighted?: boolean; // glow, e.g. when a result points at this aid
  label?: LabelLayout | null; // where to draw the label (null = hidden)
};

/** Draw one shape onto the canvas. */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  size: Size,
  { selected, showHandles, highlighted, label }: DrawOptions,
) {
  const pts = shape.points.map((q) => toPx(q, size));
  if (pts.length === 0) return;

  ctx.save();
  ctx.strokeStyle = shape.color;
  ctx.fillStyle = shape.color;
  ctx.lineWidth = selected ? LINE_WIDTH + 1 : LINE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // A soft shadow keeps lines visible on both bright sky and dark grass.
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 3;
  if (highlighted) {
    // A thick, glowing line draws the eye to the aid a result is about.
    ctx.shadowColor = shape.color;
    ctx.shadowBlur = 18;
    ctx.lineWidth = LINE_WIDTH + 3;
  }

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
      const text = `${Math.round(angleDegrees(a, b, c))}°`;
      const w = textWidth(text) + LABEL_PADDING * 2;
      pill(ctx, text, {
        x: b.x - Math.cos(mid) * 32 - w / 2,
        y: b.y - Math.sin(mid) * 32 - LABEL_HEIGHT / 2,
        w,
        h: LABEL_HEIGHT,
      }, shape.color);
    }
  }

  if (label) {
    if (label.connector) {
      // Thin line from a label that had to move away, back to its aid.
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = shape.color;
      ctx.beginPath();
      ctx.moveTo(label.connector.from.x, label.connector.from.y);
      ctx.lineTo(label.connector.to.x, label.connector.to.y);
      ctx.stroke();
      ctx.restore();
    }
    pill(ctx, label.text, label.rect, shape.color, selected);
  }

  ctx.shadowBlur = 0;
  if (selected) {
    for (const i of handleIndexes(shape)) {
      // A circle's center moves the whole circle, so it gets a "move" cross.
      const isMoveHandle = shape.kind === "circle" && i === 0;
      handle(ctx, pts[i], shape.color, isMoveHandle);
    }
    if (shape.kind === "freehand") {
      // Freehand has no handles; outline it with a dashed box instead.
      const b = shapeBounds(shape, size);
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "white";
      ctx.strokeRect(b.x - 8, b.y - 8, b.w + 16, b.h + 16);
    }
  } else if (showHandles) {
    for (const i of handleIndexes(shape)) {
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = shape.color;
      ctx.stroke();
    }
  }

  ctx.restore();
}

/** Small dots showing points placed so far while placing a training aid. */
export function drawPlacementPoints(ctx: CanvasRenderingContext2D, points: Point[], color: string, size: Size) {
  ctx.save();
  for (const p of points.map((q) => toPx(q, size))) handle(ctx, p, color, false);
  if (points.length >= 2) {
    const [a, b] = points.map((q) => toPx(q, size));
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

function handle(ctx: CanvasRenderingContext2D, p: Point, color: string, moveCross: boolean) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2);
  // A circle's move handle sits over the golfer's face, so keep it see-through.
  ctx.fillStyle = moveCross ? "rgba(255,255,255,0.35)" : "white";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();
  if (moveCross) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#0d2e1d";
    ctx.beginPath();
    ctx.moveTo(p.x - 5, p.y);
    ctx.lineTo(p.x + 5, p.y);
    ctx.moveTo(p.x, p.y - 5);
    ctx.lineTo(p.x, p.y + 5);
    ctx.stroke();
  }
}

function dot(ctx: CanvasRenderingContext2D, p: Point, r: number) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Small dark pill with white text, readable on any background.
export function pill(ctx: CanvasRenderingContext2D, text: string, r: Rect, color: string, bold = false) {
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.font = LABEL_FONT;
  ctx.fillStyle = "rgba(13,46,29,0.85)";
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 6);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = bold ? 2.5 : 1.5;
  ctx.stroke();
  ctx.fillStyle = "white";
  ctx.textBaseline = "middle";
  ctx.fillText(text, r.x + LABEL_PADDING, r.y + r.h / 2 + 1);
  ctx.restore();
}
