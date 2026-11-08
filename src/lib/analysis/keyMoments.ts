import { distance, handsPosition, torsoLength, type PoseFrame, type PoseTrack } from "../pose/landmarks";

export type MomentId = "address" | "top" | "impact";
export type KeyMoments = Record<MomentId, number>; // times in seconds

export const MOMENT_LABELS: Record<MomentId, string> = {
  address: "Address",
  top: "Top",
  impact: "Impact",
};

// The hands must move at least this far (in torso lengths) for a back-and-
// through motion to count as a swing. Real full swings reach 1.5–2 at the
// top; a small hitch or tracking blip early in the takeaway mustn't count.
const MIN_STROKE = 0.5;
// After the top, the hands must come back below this share of their furthest
// point before we accept that the downswing has started.
const RETURN_SHARE = 0.6;
// Frames within this share of the furthest point count as "paused at the top".
const TOP_PLATEAU = 0.9;
// Takeaway starts once the hands have moved this far from address (torso lengths).
const TAKEAWAY_MOVE = 0.08;
// A forward press: after that first move the hands come back below this share
// of the furthest they went, and only get well into the backswing
// (BACKSWING_UNDER_WAY torso lengths) at least PRESS_GAP seconds later. On
// IMG_1574 (a press) that took 0.3 s; on IMG_1573, where the hands' path just
// loops past the start early in the backswing, 0.05 s.
const PRESS_RETURN = 0.65;
const PRESS_GAP = 0.15;
const BACKSWING_UNDER_WAY = 0.3;
// The club head starts back before the hands visibly move (the wrists hinge
// first), and pose detection can't see the club. So the takeaway is set this
// many seconds before the hands move. Checked frame by frame on real swings.
export const CLUB_LEAD = 0.12;
// Address is shown this many seconds before the takeaway, when the club is
// still resting behind the ball.
export const ADDRESS_LEAD = 0.25;

/**
 * Find the top of the backswing and impact after the address time (full
 * swings; putts have their own, see src/lib/putting/moments.ts), by tracking
 * how far the hands are from where they were at address:
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
 * When the hands start the backswing: the first moment after address they've
 * clearly moved (TAKEAWAY_MOVE) from their resting spot. If they then come
 * back near that spot and stop, that first move was a forward press or
 * waggle (it fooled the takeaway on IMG_1574), so the next one counts. Just
 * passing near it at speed doesn't count: early in a backswing filmed down
 * the line the hands' path can loop past the start (IMG_1573).
 */
export function takeawayTime(track: PoseTrack, moments: Pick<KeyMoments, "address" | "top">): number {
  // Address can land a moment late, just as a slow takeaway starts, so the
  // search starts a little before it...
  const frames = framesAfter(track, moments.address - HOME_END).filter((f) => f.time <= moments.top);
  if (frames.length < 3) return moments.address;
  const ruler = torsoLength(frames[0].landmarks, track) || 1;
  // ...and the hands' resting spot is the median over a stretch before that.
  const resting = framesAfter(track, moments.address - HOME_START).filter((f) => f.time <= moments.address - HOME_END + 1e-6);
  const spots = (resting.length > 0 ? resting : frames.slice(0, 1)).map((f) => handsPosition(f.landmarks, track));
  const home = { x: median(spots.map((p) => p.x)), y: median(spots.map((p) => p.y)) };
  const hands = frames.map((f) => handsPosition(f.landmarks, track));
  const d = hands.map((h) => distance(h, home) / ruler);
  let from = 0;
  for (;;) {
    const i = d.findIndex((v, k) => k >= from && v > TAKEAWAY_MOVE);
    if (i < 0) return moments.address;
    // Did the hands come back part of the way and slow down before the real backswing?
    const under = d.findIndex((v, k) => k > i && v >= BACKSWING_UNDER_WAY);
    let peak = d[i];
    let back = -1;
    for (let k = i + 1; k < d.length && (under < 0 || k < under); k++) {
      peak = Math.max(peak, d[k]);
      if (d[k] < peak * PRESS_RETURN) {
        back = k;
        break;
      }
    }
    // Passing back near the start on the way into the backswing (the hands
    // are well into it moments later) isn't a press.
    if (back >= 0 && under >= 0 && frames[under].time - frames[back].time < PRESS_GAP) back = -1;
    if (back < 0) return i > 0 ? frames[i - 1].time : moments.address;
    from = back;
  }
}

// The hands' resting spot is taken from HOME_START to HOME_END seconds before address.
const HOME_START = 0.35;
const HOME_END = 0.1;

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * The finish: after impact the hands swing up and stop. The first moment
 * after their highest point (within 1.5 s of impact) that they're nearly
 * still. Null if the video ends before they settle.
 */
export function finishTime(track: PoseTrack, impact: number, stillSpeed: number): number | null {
  const frames = framesAfter(track, impact).filter((f) => f.time <= impact + 1.5);
  if (frames.length < 3) return null;
  const highest = frames.reduce((a, b) => (handsPosition(b.landmarks, track).y < handsPosition(a.landmarks, track).y ? b : a));
  const after = frames.filter((f) => f.time >= highest.time);
  for (let i = 1; i < after.length; i++) {
    const a = after[i - 1];
    const b = after[i];
    const ruler = torsoLength(b.landmarks, track) || 1;
    const speed = distance(handsPosition(a.landmarks, track), handsPosition(b.landmarks, track)) / ruler / (b.time - a.time);
    if (speed < stillSpeed) return a.time;
  }
  return null;
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
