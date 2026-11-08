import { LM, type Landmark, type PoseTrack } from "./landmarks";
import type { Size } from "../shapes";

// Pairs of landmarks joined by a "bone" (body only; face points are skipped).
const BONES: [number, number][] = [
  [LM.leftShoulder, LM.rightShoulder],
  [LM.leftShoulder, LM.leftElbow],
  [LM.leftElbow, LM.leftWrist],
  [LM.rightShoulder, LM.rightElbow],
  [LM.rightElbow, LM.rightWrist],
  [LM.leftShoulder, LM.leftHip],
  [LM.rightShoulder, LM.rightHip],
  [LM.leftHip, LM.rightHip],
  [LM.leftHip, LM.leftKnee],
  [LM.leftKnee, LM.leftAnkle],
  [LM.rightHip, LM.rightKnee],
  [LM.rightKnee, LM.rightAnkle],
  [LM.leftAnkle, LM.leftHeel],
  [LM.leftHeel, LM.leftToe],
  [LM.leftAnkle, LM.leftToe],
  [LM.rightAnkle, LM.rightHeel],
  [LM.rightHeel, LM.rightToe],
  [LM.rightAnkle, LM.rightToe],
];
const JOINTS = [...new Set(BONES.flat()), LM.nose];

/**
 * The pose at any moment in the video. We only analyzed some frames (and they
 * aren't evenly spaced: the swing gets a closer look), so blend between the
 * two nearest ones for smooth slow motion.
 */
export function poseAt(track: PoseTrack, time: number): Landmark[] | null {
  const { frames } = track;
  if (frames.length === 0) return null;
  // Binary search for the last frame at or before `time`.
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const m = Math.ceil((lo + hi) / 2);
    if (frames[m].time <= time) lo = m;
    else hi = m - 1;
  }
  const a = frames[lo];
  const b = frames[lo + 1];
  if (!a.landmarks) return b?.landmarks && b.time - time < track.step / 2 ? b.landmarks : null;
  if (!b?.landmarks || time <= a.time) return a.landmarks;
  const t = Math.min(1, (time - a.time) / (b.time - a.time));
  return a.landmarks.map((p, k) => {
    const q = b.landmarks![k];
    const z = p.z !== undefined && q.z !== undefined ? p.z + (q.z - p.z) * t : undefined;
    return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, z, visibility: Math.min(p.visibility, q.visibility) };
  });
}

/**
 * The pose around a moment, averaged over the frames within `halfWindow`
 * seconds either side (weighted by confidence), so a key position isn't
 * read from one jittery frame. Falls back to `poseAt` if no frame is that close.
 */
export function poseAround(track: PoseTrack, time: number, halfWindow: number): Landmark[] | null {
  const near = track.frames.filter((f) => f.landmarks && Math.abs(f.time - time) <= halfWindow + 1e-6);
  if (near.length < 2) return poseAt(track, time);
  return near[0].landmarks!.map((_, k) => {
    let sx = 0, sy = 0, sz = 0, sw = 0, zw = 0, sv = 0;
    for (const f of near) {
      const p = f.landmarks![k];
      const w = Math.max(p.visibility, 0.05);
      sx += p.x * w;
      sy += p.y * w;
      sv += p.visibility;
      sw += w;
      if (p.z !== undefined) {
        sz += p.z * w;
        zw += w;
      }
    }
    return { x: sx / sw, y: sy / sw, z: zw > 0 ? sz / zw : undefined, visibility: sv / near.length };
  });
}

export function drawSkeleton(ctx: CanvasRenderingContext2D, lms: Landmark[], size: Size) {
  const at = (i: number) => ({ x: lms[i].x * size.width, y: lms[i].y * size.height });
  ctx.save();
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const [a, b] of BONES) {
    const p = at(a);
    const q = at(b);
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
  }
  ctx.stroke();
  ctx.fillStyle = "#22c55e";
  for (const j of JOINTS) {
    const p = at(j);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
