import type { ShotMode } from "@/config/analysisConfig";
import { distance, handsPosition, torsoLength, type PoseFrame, type PoseTrack } from "../pose/landmarks";

export type MomentId = "address" | "top" | "impact";
export type KeyMoments = Record<MomentId, number>; // times in seconds

export const MOMENT_LABELS: Record<MomentId, string> = {
  address: "Address",
  top: "Top",
  impact: "Impact",
};

// The hands must move at least this far (in torso lengths) for a back-and-
// through motion to count as a stroke. Small enough for a short putt.
const MIN_STROKE = 0.12;
// After the top, the hands must come back below this share of their furthest
// point before we accept that the downswing has started.
const RETURN_SHARE = 0.6;
// Frames within this share of the furthest point count as "paused at the top".
const TOP_PLATEAU = 0.9;
// Takeaway starts once the hands have moved this far from address (torso
// lengths), or TAKEAWAY_SHARE of the way to the top for short putting strokes
// (but at least TAKEAWAY_MIN, so tracking jitter doesn't count).
const TAKEAWAY_MOVE = 0.08;
const TAKEAWAY_SHARE = 0.1;
const TAKEAWAY_MIN = 0.05;
// The club head starts back before the hands visibly move (the wrists hinge
// first), and pose detection can't see the club. So the takeaway is set this
// many seconds before the hands move. Checked frame by frame on real full
// swings and putts (putts have almost no wrist hinge, so it's only the short
// delay before the hands have moved far enough to count).
export const CLUB_LEAD: Record<ShotMode, number> = { "full-swing": 0.12, putt: 0.05 };
// Address is shown this many seconds before the hands move, when the club is
// still resting behind the ball.
export const ADDRESS_LEAD = 0.25;

/**
 * Find the top of the backswing and impact after the address time.
 *
 * Works for full swings and putts alike by tracking how far the hands are
 * from where they were at address:
 *  - top    = the first time that distance peaks before shrinking again
 *  - impact = after the top, the moment the hands come back closest to address
 */
export function detectKeyMoments(track: PoseTrack, addressTime: number): KeyMoments | null {
  const after = framesAfter(track, addressTime);
  if (after.length < 3) return null;
  const { distances } = handDistances(track, after);

  // Top: keep the furthest point so far; once the hands come well back, it was the top.
  let top = -1;
  let peak = 0;
  for (let i = 0; i < distances.length; i++) {
    if (distances[i] > peak) {
      peak = distances[i];
      top = i;
    } else if (peak >= MIN_STROKE && distances[i] < peak * RETURN_SHARE) {
      break;
    }
  }
  if (top < 0 || peak < MIN_STROKE) return null;

  // Impact: the closest return to address before the follow-through carries the hands away again.
  let impact = -1;
  for (let i = top + 1; i < distances.length; i++) {
    if (impact >= 0 && distances[i] > distances[impact] + peak * 0.3) break;
    if (impact < 0 || distances[i] < distances[impact]) impact = i;
  }
  if (impact < 0) return null;

  // The hands pause at the top, so the furthest point jumps around within that
  // pause from frame to frame (and tracking noise can dip in the middle of
  // it). The pause runs from the first time the hands get near the furthest
  // point to the last time before impact; its middle is a steady marker.
  const paused = (i: number) => distances[i] >= peak * TOP_PLATEAU;
  const first = distances.findIndex((_, i) => paused(i));
  let last = top;
  for (let i = top + 1; i < impact; i++) if (paused(i)) last = i;
  const topTime = (after[first].time + after[last].time) / 2;

  return { address: addressTime, top: topTime, impact: after[impact].time };
}

/**
 * When the hands start the backswing: the first moment after address that
 * they've clearly moved away from their address spot. (Address is
 * already the last moment the hands were at rest, so slow drifts before it
 * don't count, and pauses at the top don't matter.)
 */
export function takeawayTime(track: PoseTrack, moments: Pick<KeyMoments, "address" | "top">): number {
  const frames = framesAfter(track, moments.address).filter((f) => f.time <= moments.top);
  if (frames.length < 2) return moments.address;
  const ruler = torsoLength(frames[0].landmarks, track) || 1;
  const home = handsPosition(frames[0].landmarks, track);
  const moved = frames.map((f) => distance(handsPosition(f.landmarks, track), home) / ruler);
  const threshold = Math.min(TAKEAWAY_MOVE, Math.max(TAKEAWAY_MIN, Math.max(...moved) * TAKEAWAY_SHARE));
  const i = moved.findIndex((d) => d > threshold);
  return i > 0 ? frames[i - 1].time : moments.address;
}

type FrameWithPose = PoseFrame & { landmarks: NonNullable<PoseFrame["landmarks"]> };

function framesAfter(track: PoseTrack, time: number): FrameWithPose[] {
  return track.frames.filter((f): f is FrameWithPose => f.landmarks !== null && f.time >= time - 1e-6);
}

// Distance of the hands from their address position, in torso lengths,
// lightly smoothed (average of 3 neighbors) to ignore detection jitter.
function handDistances(track: PoseTrack, frames: FrameWithPose[]) {
  const start = frames[0].landmarks;
  const ruler = torsoLength(start, track) || 1;
  const home = handsPosition(start, track);
  const raw = frames.map((f) => distance(handsPosition(f.landmarks, track), home) / ruler);
  const distances = raw.map((_, i) => {
    const near = raw.slice(Math.max(0, i - 1), i + 2);
    return near.reduce((s, d) => s + d, 0) / near.length;
  });
  return { distances };
}
