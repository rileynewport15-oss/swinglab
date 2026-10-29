import { LM, distance, handsPosition, headCenter, mid, px, torsoLength, type Landmark, type PoseTrack, type Px } from "../pose/landmarks";

// Geometry shared by putting moments, aids and results.

export type PuttView = "face-on" | "down-the-line";

export type PoseSample = { time: number; lms: Landmark[] };

/** Frames with a golfer in them, between two times. */
export function samples(track: PoseTrack, from = -Infinity, to = Infinity): PoseSample[] {
  return track.frames
    .filter((f) => f.landmarks && f.time >= from - 1e-6 && f.time <= to + 1e-6)
    .map((f) => ({ time: f.time, lms: f.landmarks! }));
}

// Seen from the front, the shoulders are about 0.8 torso lengths apart; from
// down the line one is behind the other (about 0.1–0.3).
const FACE_ON_SHOULDERS = 0.5;

/**
 * Which way the camera looks at the golfer, from the pose itself. Used to
 * pick how the stroke is timed, so a wrong camera angle choice can't break it.
 */
export function detectView(track: PoseTrack): PuttView {
  const widths = samples(track).map(({ lms }) => {
    const ruler = torsoLength(lms, track) || 1;
    return Math.abs(px(lms, LM.leftShoulder, track).x - px(lms, LM.rightShoulder, track).x) / ruler;
  });
  return median(widths) >= FACE_ON_SHOULDERS ? "face-on" : "down-the-line";
}

export const feetMid = (lms: Landmark[], track: PoseTrack) =>
  mid(px(lms, LM.leftAnkle, track), px(lms, LM.rightAnkle, track));

/**
 * A point measured from the feet. In a putt the feet don't move, so this
 * cancels out a hand-held camera drifting during the stroke (checked on real
 * putts: the whole skeleton, feet included, drifted ~1–3 in).
 */
export function fromFeet(lms: Landmark[], track: PoseTrack, p: Px): Px {
  const feet = feetMid(lms, track);
  return { x: p.x - feet.x, y: p.y - feet.y };
}

const SMOOTHING = 0.05; // seconds either side

// Hands and head measured from the feet, in video pixels.
export type HandSample = { time: number; hands: Px; head: Px };

/** Where the hands (and head) are, from the feet, in every frame, lightly smoothed. */
export function handPath(track: PoseTrack, from = -Infinity, to = Infinity): HandSample[] {
  const raw = samples(track, from - SMOOTHING, to + SMOOTHING).map(({ time, lms }) => ({
    time,
    hands: fromFeet(lms, track, handsPosition(lms, track)),
    head: fromFeet(lms, track, headCenter(lms, track)),
  }));
  const average = (points: Px[]) => ({
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  });
  return raw
    .filter((s) => s.time >= from - 1e-6 && s.time <= to + 1e-6)
    .map(({ time }) => {
      const near = raw.filter((s) => Math.abs(s.time - time) <= SMOOTHING + 1e-6);
      return { time, hands: average(near.map((s) => s.hands)), head: average(near.map((s) => s.head)) };
    });
}

/** The golfer's size in pixels: median torso length over the clip. */
export function bodyRuler(track: PoseTrack): number {
  return median(samples(track).map(({ lms }) => torsoLength(lms, track))) || 1;
}

/**
 * The pendulum: the triangle formed by both shoulders and the hands.
 * - shoulders: angle of the line through the shoulders
 * - arms: angle of the line from the middle of the shoulders to the hands
 * Both in degrees, in the picture (meaningful face on).
 */
export function pendulum(lms: Landmark[], track: PoseTrack) {
  const left = px(lms, LM.leftShoulder, track);
  const right = px(lms, LM.rightShoulder, track);
  const center = mid(left, right);
  const hands = handsPosition(lms, track);
  return {
    left,
    right,
    center,
    hands,
    shoulders: degrees(Math.atan2(left.y - right.y, left.x - right.x)),
    arms: degrees(Math.atan2(hands.y - center.y, hands.x - center.x)),
    armLength: distance(center, hands),
  };
}

/**
 * How the pendulum has moved since setup, in degrees: how far the shoulders
 * rocked, how far the arms swung, and the difference between them (the
 * triangle changing shape: hands running ahead of or behind the shoulders).
 */
export function pendulumChange(setup: Landmark[], now: Landmark[], track: PoseTrack) {
  const a = pendulum(setup, track);
  const b = pendulum(now, track);
  const shoulders = wrap(b.shoulders - a.shoulders);
  const arms = wrap(b.arms - a.arms);
  return { shoulders, arms, triangle: wrap(arms - shoulders) };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function degrees(radians: number) {
  return (radians * 180) / Math.PI;
}

/** An angle difference in -180..180. */
function wrap(deg: number) {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}
