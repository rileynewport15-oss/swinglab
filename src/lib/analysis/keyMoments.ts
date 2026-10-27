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
// Takeaway: walking back from the top, the hands are "at rest" once their
// speed (averaged over SPEED_SPAN seconds) drops below this, in torso lengths/s.
const TAKEAWAY_SPEED = 0.5;
const SPEED_SPAN = 0.1;
// Look this far before the address marker for the takeaway start.
const TAKEAWAY_SEARCH = 1.5;
// The club head starts back before the hands visibly move (the wrists hinge
// first), and pose detection can't see the club. So the takeaway is set this
// many seconds before the hands move. Checked frame by frame on real full
// swings; putts have almost no wrist hinge.
export const CLUB_LEAD: Record<ShotMode, number> = { "full-swing": 0.12, chip: 0.06, putt: 0 };
// Address is shown this many seconds before the hands move, when the club is
// still resting behind the ball.
export const ADDRESS_LEAD = 0.25;

/**
 * Find the top of the backswing and impact after the address time.
 *
 * Works for swings, chips and putts alike by tracking how far the hands are
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

  return { address: addressTime, top: after[top].time, impact: after[impact].time };
}

/**
 * When the hands start the backswing. Walks back from the top until the hands
 * were (nearly) at rest, so a slow drift or waggle at address isn't counted
 * as part of the backswing.
 */
export function takeawayTime(track: PoseTrack, moments: Pick<KeyMoments, "address" | "top">): number {
  const frames = framesAfter(track, moments.address - TAKEAWAY_SEARCH).filter((f) => f.time <= moments.top);
  if (frames.length < 2) return moments.address;
  const ruler = torsoLength(frames[0].landmarks, track) || 1;
  for (let i = frames.length - 1; i > 0; i--) {
    // The latest frame at least SPEED_SPAN seconds earlier.
    let j = i - 1;
    while (j > 0 && frames[i].time - frames[j].time < SPEED_SPAN) j--;
    const moved = distance(handsPosition(frames[i].landmarks, track), handsPosition(frames[j].landmarks, track));
    const speed = moved / ruler / (frames[i].time - frames[j].time);
    if (speed < TAKEAWAY_SPEED) return frames[i].time;
  }
  return frames[0].time;
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
