import { ANALYSIS_CONFIG } from "@/config/analysisConfig";
import { LM, type Landmark, type PoseFrame, type PoseTrack } from "./landmarks";

const { minFrameVisibility, windowSeconds } = ANALYSIS_CONFIG.smoothing;
const CORE = [LM.leftShoulder, LM.rightShoulder, LM.leftHip, LM.rightHip];

/**
 * Clean up the raw pose data before anything is measured:
 * 1. Frames where the body was barely seen (low confidence in the shoulders
 *    and hips) are dropped, so one bad frame can't pass for a movement.
 * 2. Each landmark is averaged with the same landmark in its neighboring
 *    frames, weighted toward the middle frame and by confidence, which takes
 *    out frame-to-frame jitter.
 */
export function cleanTrack(track: PoseTrack): PoseTrack {
  const trusted: PoseFrame[] = track.frames.map((f) =>
    f.landmarks && average(CORE.map((i) => f.landmarks![i].visibility)) >= minFrameVisibility
      ? f
      : { time: f.time, landmarks: null },
  );
  const seen = trusted.filter((f) => f.landmarks) as (PoseFrame & { landmarks: Landmark[] })[];

  const frames = trusted.map((f) => {
    if (!f.landmarks) return f;
    const near = seen.filter((g) => Math.abs(g.time - f.time) <= windowSeconds + 1e-6);
    if (near.length < 2) return f;
    // Triangle weights: the frame itself counts most, the furthest ones least.
    const weight = (g: PoseFrame) => 1 - Math.abs(g.time - f.time) / (windowSeconds * 2);
    const landmarks = f.landmarks.map((_, k) => {
      let sx = 0, sy = 0, sz = 0, sv = 0, sw = 0, zw = 0;
      for (const g of near) {
        const p = g.landmarks[k];
        const w = weight(g) * Math.max(p.visibility, 0.05);
        sx += p.x * w;
        sy += p.y * w;
        sv += p.visibility * weight(g);
        sw += w;
        if (p.z !== undefined) {
          sz += p.z * w;
          zw += w;
        }
      }
      const total = near.reduce((s, g) => s + weight(g), 0);
      return { x: sx / sw, y: sy / sw, z: zw > 0 ? sz / zw : undefined, visibility: sv / total };
    });
    return { time: f.time, landmarks };
  });
  return { ...track, frames };
}

function average(values: number[]) {
  return values.reduce((s, v) => s + v, 0) / values.length;
}
