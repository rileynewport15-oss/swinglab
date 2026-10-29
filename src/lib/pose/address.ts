import { LM, distance, handsPosition, px, torsoLength, type Landmark, type PoseTrack } from "./landmarks";

// Speeds are measured in "torso lengths per second", so the same thresholds
// work whether the golfer is close to the camera or far away.
const STILL_SPEED = 0.35; // below this, the golfer counts as still
const SWING_SPEED = 2.0; // hands faster than this = the swing has started
const SPEED_WINDOW = 0.25; // seconds; comparing frames this far apart smooths out jitter
const MIN_STILL_SECONDS = 0.3;
// A stroke: the hands move at least MIN_STROKE torso lengths away from address
// and come back within RETURN_SHARE of that distance, within RETURN_WITHIN seconds.
const MIN_STROKE = 0.12;
const RETURN_SHARE = 0.6;
const RETURN_WITHIN = 4;
// Hands within this many torso lengths of their resting spot count as at rest.
const SETTLED_HANDS = 0.06;
// The resting spot is measured over the end of the still stretch only, because
// a long stretch also includes the golfer setting up before address.
const REST_WINDOW = 1.0;

const BODY_POINTS = [
  LM.nose,
  LM.leftShoulder,
  LM.rightShoulder,
  LM.leftWrist,
  LM.rightWrist,
  LM.leftHip,
  LM.rightHip,
];
const HAND_POINTS = [LM.leftWrist, LM.rightWrist];

export type AddressFrame = { index: number; time: number; landmarks: Landmark[] };

/**
 * Find the address position: the golfer standing still over the ball right
 * before the swing starts. Returns null if no golfer was found at all.
 */
export function findAddress(track: PoseTrack): AddressFrame | null {
  const { frames } = track;
  const lag = Math.max(1, Math.round(SPEED_WINDOW / track.step));

  // How fast the given body points moved over the last `lag` frames.
  const speed = (i: number, points: number[]) => {
    const now = frames[i]?.landmarks;
    const before = frames[i - lag]?.landmarks;
    if (!now || !before) return null;
    const ruler = (torsoLength(now, track) + torsoLength(before, track)) / 2 || 1;
    const moved =
      points.reduce((sum, p) => sum + distance(px(now, p, track), px(before, p, track)), 0) / points.length;
    return moved / ruler / (frames[i].time - frames[i - lag].time);
  };

  // 1. When does the swing start? The first time the hands move fast after
  //    the golfer has been still at least once (a glitchy first frame can
  //    make the hands look like they jumped).
  let swingStart = frames.length;
  let wasStill = false;
  for (let i = lag; i < frames.length; i++) {
    const body = speed(i, BODY_POINTS);
    if (body !== null && body < STILL_SPEED) wasStill = true;
    const s = speed(i, HAND_POINTS);
    if (wasStill && s !== null && s > SWING_SPEED) {
      swingStart = i;
      break;
    }
  }

  // Where the hands rest at the end of a still stretch: their median position,
  // so a slow drift or the start of a slow backstroke doesn't count.
  function restingHands(r: { start: number; end: number }) {
    const from = frames[r.end].time - REST_WINDOW;
    const pts = frames
      .slice(r.start, r.end + 1)
      .filter((f) => f.time >= from).flatMap((f) => (f.landmarks ? [handsPosition(f.landmarks, track)] : []));
    const median = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
    const ruler = torsoLength(frames[r.start].landmarks!, track) || 1;
    return { hands: { x: median(pts.map((p) => p.x)), y: median(pts.map((p) => p.y)) }, ruler };
  }

  // The last frame of a still stretch where the hands are still at rest (a
  // slow putting backstroke can look "still" and stretch past address).
  function settledEnd(r: { start: number; end: number }) {
    const { hands, ruler } = restingHands(r);
    for (let i = r.end; i > r.start; i--) {
      const lms = frames[i].landmarks;
      if (lms && distance(handsPosition(lms, track), hands) / ruler <= SETTLED_HANDS) return i;
    }
    return r.end;
  }

  // 2. Find stretches where the whole body is still, before the swing.
  const runs: { start: number; end: number }[] = [];
  let runStart = -1;
  for (let i = lag; i <= swingStart; i++) {
    const s = i < swingStart ? speed(i, BODY_POINTS) : null;
    const still = s !== null && s < STILL_SPEED;
    if (still && runStart < 0) runStart = i;
    if (!still && runStart >= 0) {
      runs.push({ start: runStart, end: i - 1 });
      runStart = -1;
    }
  }
  const longEnough = runs.filter(
    (r) => frames[r.end].time - frames[r.start].time + track.step * lag >= MIN_STILL_SECONDS,
  );

  // 3. Address = the end of the last still stretch that is followed by a
  //    there-and-back stroke: the hands move away from where they rested and
  //    then come back near it (impact). This skips other pauses, like the top
  //    of a slow putting backstroke, after which the hands never come back.
  //    Measured from where the hands rested at the end of the stretch.
  const isAddress = (r: { start: number; end: number }) => {
    const { hands: homeHands, ruler } = restingHands(r);
    let peak = 0;
    for (let i = r.end + 1; i < frames.length && frames[i].time <= frames[r.end].time + RETURN_WITHIN; i++) {
      const lms = frames[i].landmarks;
      if (!lms) continue;
      const d = distance(handsPosition(lms, track), homeHands) / ruler;
      peak = Math.max(peak, d);
      if (peak >= MIN_STROKE && d < peak * RETURN_SHARE) return true;
    }
    return false;
  };
  const run = [...longEnough].reverse().find(isAddress) ?? (swingStart < frames.length ? longEnough.at(-1) : longEnough[0]);
  if (run) return pick(track, settledEnd(run));

  // No clear still stretch: fall back to the calmest frame with a golfer in it.
  let best: { index: number; s: number } | null = null;
  for (let i = lag; i < swingStart; i++) {
    const s = speed(i, BODY_POINTS);
    if (s !== null && (!best || s < best.s)) best = { index: i, s };
  }
  if (best) return pick(track, best.index);
  const first = frames.findIndex((f) => f.landmarks);
  return first >= 0 ? pick(track, first) : null;
}

function pick(track: PoseTrack, index: number): AddressFrame {
  const frame = track.frames[index];
  return { index, time: frame.time, landmarks: frame.landmarks! };
}

export type QualityProblem = "not-found" | "too-small" | "unclear";

/** Is the golfer big and clear enough for the aids to be trusted? */
export function checkQuality(track: PoseTrack, address: AddressFrame | null): QualityProblem | null {
  const found = track.frames.filter((f) => f.landmarks).length;
  if (!address || found < track.frames.length * 0.3) return "not-found";

  const lms = address.landmarks;
  const key: number[] = [LM.nose, LM.leftShoulder, LM.rightShoulder, LM.leftHip, LM.rightHip, LM.leftAnkle, LM.rightAnkle];
  const visibility = key.reduce((sum, i) => sum + lms[i].visibility, 0) / key.length;
  if (visibility < 0.5) return "unclear";

  // Nose to feet (bent over at address) should cover at least 15% of the
  // frame height; smaller than that and inches become unreliable.
  const feetY = Math.max(lms[LM.leftAnkle].y, lms[LM.rightAnkle].y);
  if (feetY - lms[LM.nose].y < 0.15) return "too-small";

  return null;
}
