import { LM, distance, px, torsoLength, type Landmark, type PoseTrack } from "./landmarks";

// Speeds are measured in "torso lengths per second", so the same thresholds
// work whether the golfer is close to the camera or far away.
const STILL_SPEED = 0.35; // below this, the golfer counts as still
const SWING_SPEED = 2.0; // hands faster than this = the swing has started
const SPEED_WINDOW = 0.25; // seconds; comparing frames this far apart smooths out jitter
const MIN_STILL_SECONDS = 0.3;

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

  // 1. When does the swing start? The first time the hands move fast.
  let swingStart = frames.length;
  for (let i = lag; i < frames.length; i++) {
    const s = speed(i, HAND_POINTS);
    if (s !== null && s > SWING_SPEED) {
      swingStart = i;
      break;
    }
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

  // 3. Address = the end of the last still stretch before the swing (the frame
  //    right before the takeaway). With no swing found, use the first stretch.
  const run = swingStart < frames.length ? longEnough.at(-1) : longEnough[0];
  if (run) return pick(track, run.end);

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
