"use client";

import { useEffect, useRef, type RefObject } from "react";
import { poseAt } from "@/lib/pose/skeleton";
import { handsPosition, type PoseTrack, type Px } from "@/lib/pose/landmarks";
import { pendulum, pendulumChange, samples } from "@/lib/putting/stroke";
import { PUTT_COLORS } from "@/lib/putting/aids";
import type { PuttMoments } from "@/lib/putting/moments";
import { LABEL_HEIGHT, labelWidth, pill, type AidKind, type Size } from "@/lib/shapes";

type LiveAid = "shoulders" | "triangle" | "handPath";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  track: PoseTrack;
  moments: PuttMoments | null;
  shownAt: (aid: LiveAid, time: number) => boolean; // Aids panel settings and timing
  highlightAid: AidKind | null;
  showLabels: boolean;
};

// How long the hand path keeps drawing after the finish (seconds).
const PATH_AFTER_FINISH = 0.3;

// The putting aids that move with the golfer, redrawn every frame:
// - Shoulder line: through both shoulders, with a faint copy of where it was
//   at setup, so the rocking shows.
// - Pendulum triangle: shoulders to hands, plus a dashed triangle showing where
//   the hands would be if only the shoulders rocked. A gap = breakdown.
// - Hand path: the hands' path from setup up to now.
export default function PuttOverlay({ videoRef, track, moments, shownAt, highlightAid, showLabels }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ shownAt, highlightAid, showLabels, moments });
  const redrawRef = useRef<() => void>(() => {});
  // After every render (e.g. an aid was switched off), redraw right away.
  useEffect(() => {
    propsRef.current = { shownAt, highlightAid, showLabels, moments };
    redrawRef.current();
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frameId = 0;
    let last = "";

    const redraw = () => {
      const video = videoRef.current;
      if (!video) return;
      const { shownAt, highlightAid, showLabels, moments } = propsRef.current;
      const { clientWidth: width, clientHeight: height } = canvas;
      const t = video.currentTime;
      const shown = (["shoulders", "triangle", "handPath"] as LiveAid[]).filter((a) => shownAt(a, t));
      // Redraw only when something changed.
      const key = [t, width, height, shown.join(), highlightAid, showLabels, moments?.setup, moments?.finish].join("|");
      if (key === last) return;
      last = key;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (!moments || shown.length === 0) return;
      const size = { width, height };
      const pose = poseAt(track, t);
      const setup = poseAt(track, moments.setup);
      if (!pose || !setup) return;
      // Video pixels → canvas pixels.
      const toCanvas = (p: Px) => ({ x: (p.x / track.width) * width, y: (p.y / track.height) * height });
      const style = (aid: LiveAid) => ({ color: PUTT_COLORS[aid], glow: highlightAid === aid });

      if (shown.includes("handPath") && t >= moments.setup) {
        const end = Math.min(t, moments.finish + PATH_AFTER_FINISH);
        const points = samples(track, moments.setup, end).map((f) => toCanvas(handsPosition(f.lms, track)));
        points.push(toCanvas(handsPosition(pose, track)));
        line(ctx, points, style("handPath"));
        dot(ctx, points[points.length - 1], PUTT_COLORS.handPath);
        if (showLabels) label(ctx, "Hand path", points[0], PUTT_COLORS.handPath, size, -1);
      }

      const now = pendulum(pose, track);
      const before = pendulum(setup, track);
      const change = pendulumChange(setup, pose, track);

      if (shown.includes("shoulders")) {
        const ghost = extend(toCanvas(before.left), toCanvas(before.right), 0.25);
        line(ctx, ghost, { color: "rgba(255,255,255,0.55)", glow: false, dashed: true, width: 2 });
        const live = extend(toCanvas(now.left), toCanvas(now.right), 0.25);
        line(ctx, live, style("shoulders"));
        if (showLabels) {
          const outer = live[0].x > live[1].x ? live[0] : live[1];
          label(ctx, `Shoulders ${Math.round(Math.abs(change.shoulders))}°`, outer, PUTT_COLORS.shoulders, size, 1);
        }
      }

      if (shown.includes("triangle")) {
        // Where the hands would be if the triangle had only rocked with the shoulders.
        const angle = (change.shoulders * Math.PI) / 180;
        const arm = { x: before.hands.x - before.center.x, y: before.hands.y - before.center.y };
        const ideal = {
          x: now.center.x + arm.x * Math.cos(angle) - arm.y * Math.sin(angle),
          y: now.center.y + arm.x * Math.sin(angle) + arm.y * Math.cos(angle),
        };
        const corners = (hands: Px) => [now.left, now.right, hands, now.left].map(toCanvas);
        line(ctx, corners(ideal), { color: "rgba(255,255,255,0.6)", glow: false, dashed: true, width: 2 });
        line(ctx, corners(now.hands), style("triangle"));
        if (showLabels) {
          label(ctx, `Triangle ${Math.round(Math.abs(change.triangle))}°`, toCanvas(now.hands), PUTT_COLORS.triangle, size, 1);
        }
      }
    };
    redrawRef.current = redraw;
    const tick = () => {
      frameId = requestAnimationFrame(tick);
      redraw();
    };
    tick();
    return () => cancelAnimationFrame(frameId);
  }, [videoRef, track]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}

type LineStyle = { color: string; glow: boolean; dashed?: boolean; width?: number };

function line(ctx: CanvasRenderingContext2D, points: Px[], { color, glow, dashed, width = 3 }: LineStyle) {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = glow ? width + 3 : width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Same look as the other aids: a soft shadow, or a glow when a result points here.
  ctx.shadowColor = glow ? color : "rgba(0,0,0,0.6)";
  ctx.shadowBlur = glow ? 18 : 3;
  if (dashed) ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, p: Px, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** A label pill next to a point, kept on screen. side: +1 = to the right, -1 = to the left. */
function label(ctx: CanvasRenderingContext2D, text: string, at: Px, color: string, size: Size, side: 1 | -1) {
  const w = labelWidth(text);
  const x = side > 0 ? at.x + 10 : at.x - 10 - w;
  pill(
    ctx,
    text,
    {
      x: Math.min(Math.max(x, 4), size.width - w - 4),
      y: Math.min(Math.max(at.y - LABEL_HEIGHT / 2, 4), size.height - LABEL_HEIGHT - 4),
      w,
      h: LABEL_HEIGHT,
    },
    color,
  );
}

/** The segment a–b, lengthened by `amount` of its length at each end. */
function extend(a: Px, b: Px, amount: number): Px[] {
  const dx = (b.x - a.x) * amount;
  const dy = (b.y - a.y) * amount;
  return [
    { x: a.x - dx, y: a.y - dy },
    { x: b.x + dx, y: b.y + dy },
  ];
}
