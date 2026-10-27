import {
  LABEL_HEIGHT,
  clamp,
  dist,
  labelText,
  labelWidth,
  toPx,
  type LabelLayout,
  type Point,
  type Rect,
  type Shape,
  type Size,
} from "./shapes";

// Labels are placed all together so they don't cover any line or each other.
// Each label tries a list of spots beside its aid (nearest first) and takes the
// first one that's clear. A label that had to move away from its aid gets a
// thin connector line back to it. Labels the user dragged stay where they are.

const GAP = 8; // space between an aid and its label
const PAD = 3; // labels count as overlapping slightly before they touch
const CONNECTOR_MIN = GAP + 6; // draw a connector once a label is this far from its aid

type Candidate = { center: Point; attach: Point };

export function layoutLabels(shapes: Shape[], size: Size): Map<string, LabelLayout> {
  const layouts = new Map<string, LabelLayout>();
  const placed: Rect[] = [];
  const segments = shapes.flatMap((s) => segmentsOf(s, size));

  for (const shape of shapes) {
    const text = labelText(shape, size);
    if (!text || shape.points.length < 2) continue;
    const w = labelWidth(text);
    const candidates = candidatesFor(shape, size, w);
    if (candidates.length === 0) continue;

    let chosen: { rect: Rect; c: Candidate } | null = null;
    if (shape.labelAt) {
      // The user dragged this label: keep it there.
      const center = toPx(shape.labelAt, size);
      chosen = { rect: rectAt(center, w, size), c: { attach: candidates[0].attach, center } };
    } else {
      let best: { rect: Rect; c: Candidate; score: number } | null = null;
      for (const c of candidates) {
        const rect = rectAt(c.center, w, size);
        const score = collisions(rect, placed, segments);
        if (!best || score < best.score) best = { rect, c, score };
        if (score === 0) break; // first clear spot wins
      }
      chosen = best;
    }
    if (!chosen) continue;

    placed.push(chosen.rect);
    const edge = nearestOnRect(chosen.c.attach, chosen.rect);
    layouts.set(shape.id, {
      text,
      rect: chosen.rect,
      connector: dist(edge, chosen.c.attach) > CONNECTOR_MIN ? { from: chosen.c.attach, to: edge } : null,
    });
  }
  return layouts;
}

/** Spots to try for a label, best first. */
function candidatesFor(shape: Shape, size: Size, w: number): Candidate[] {
  const pts = shape.points.map((p) => toPx(p, size));
  const h = LABEL_HEIGHT;
  // How far from a point to put a label's center so the label just clears it, in direction (dx, dy).
  const clear = (dx: number, dy: number, extra: number) => Math.abs(dx) * (w / 2) + Math.abs(dy) * (h / 2) + GAP + extra;

  if (shape.kind === "circle") {
    const r = dist(pts[0], pts[1]);
    // Above first, then around the circle.
    const angles = [-90, -45, -135, 0, 180, 45, 135, 90];
    return [0, 30].flatMap((extra) =>
      angles.map((deg) => {
        const dx = Math.cos((deg * Math.PI) / 180);
        const dy = Math.sin((deg * Math.PI) / 180);
        const attach = { x: pts[0].x + dx * r, y: pts[0].y + dy * r };
        const d = clear(dx, dy, extra);
        return { attach, center: { x: attach.x + dx * d, y: attach.y + dy * d } };
      }),
    );
  }

  if (shape.kind === "box") {
    const [a, b] = pts;
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const top = Math.min(a.y, b.y);
    const bottom = Math.max(a.y, b.y);
    const left = Math.min(a.x, b.x);
    const right = Math.max(a.x, b.x);
    return [
      { attach: { x: cx, y: top }, center: { x: cx, y: top - h / 2 - GAP } },
      { attach: { x: cx, y: bottom }, center: { x: cx, y: bottom + h / 2 + GAP } },
      { attach: { x: right, y: cy }, center: { x: right + w / 2 + GAP, y: cy } },
      { attach: { x: left, y: cy }, center: { x: left - w / 2 - GAP, y: cy } },
    ];
  }

  if (shape.kind === "line") {
    const [a, b] = pts;
    const len = dist(a, b) || 1;
    // Unit vector at a right angle to the line, pointing upward (or left if vertical).
    let nx = -(b.y - a.y) / len;
    let ny = (b.x - a.x) / len;
    if (ny > 0 || (ny === 0 && nx > 0)) {
      nx = -nx;
      ny = -ny;
    }
    const out: Candidate[] = [];
    for (const extra of [0, 26]) {
      for (const t of [0.5, 0.3, 0.7, 0.15, 0.85]) {
        for (const side of [1, -1]) {
          const attach = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
          const d = clear(nx, ny, extra) * side;
          out.push({ attach, center: { x: attach.x + nx * d, y: attach.y + ny * d } });
        }
      }
    }
    return out;
  }
  return [];
}

function rectAt(center: Point, w: number, size: Size): Rect {
  const h = LABEL_HEIGHT;
  return {
    x: clamp(center.x - w / 2, 2, size.width - w - 2),
    y: clamp(center.y - h / 2, 2, size.height - h - 2),
    w,
    h,
  };
}

/** How many lines and labels this label would cover. */
function collisions(rect: Rect, placed: Rect[], segments: [Point, Point][]) {
  const r = { x: rect.x - PAD, y: rect.y - PAD, w: rect.w + PAD * 2, h: rect.h + PAD * 2 };
  let n = 0;
  for (const other of placed) if (overlaps(r, other)) n += 2; // covering a label is worse
  for (const [a, b] of segments) if (segmentHitsRect(a, b, r)) n += 1;
  return n;
}

/** The outline of a shape as straight pieces (circles become 24-sided). */
function segmentsOf(shape: Shape, size: Size): [Point, Point][] {
  const pts = shape.points.map((p) => toPx(p, size));
  if (pts.length < 2) return [];
  if (shape.kind === "circle") {
    const r = dist(pts[0], pts[1]);
    const ring = Array.from({ length: 24 }, (_, i) => ({
      x: pts[0].x + r * Math.cos((i / 24) * Math.PI * 2),
      y: pts[0].y + r * Math.sin((i / 24) * Math.PI * 2),
    }));
    return ring.map((p, i) => [p, ring[(i + 1) % 24]]);
  }
  if (shape.kind === "box") {
    const [a, b] = pts;
    const c = [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }];
    return c.map((p, i) => [p, c[(i + 1) % 4]]);
  }
  return pts.slice(1).map((p, i) => [pts[i], p]);
}

function overlaps(a: Rect, b: Rect) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function inside(p: Point, r: Rect) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function segmentHitsRect(a: Point, b: Point, r: Rect) {
  if (inside(a, r) || inside(b, r)) return true;
  const corners = [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h },
  ];
  return corners.some((c, i) => segmentsCross(a, b, c, corners[(i + 1) % 4]));
}

function segmentsCross(p1: Point, p2: Point, p3: Point, p4: Point) {
  const d = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function nearestOnRect(p: Point, r: Rect): Point {
  return { x: clamp(p.x, r.x, r.x + r.w), y: clamp(p.y, r.y, r.y + r.h) };
}
