import type { PoseTrack } from "../pose/landmarks";
import { bodyRuler, detectView, handPath, median, type HandSample, type PuttView } from "./stroke";

export type PuttMomentId = "setup" | "backstroke" | "impact" | "finish";
export type PuttMoments = Record<PuttMomentId, number>; // times in seconds

// All distances are in torso lengths and speeds in torso lengths per second,
// so the same numbers work near or far from the camera.

// Hands slower than this count as at rest.
const STILL_SPEED = 0.15;
// Speeds for that are measured over this span (seconds).
const SPEED_SPAN = 0.1;
// ...for at least this long (seconds) before the stroke.
const STILL_SECONDS = 0.15;
// The rest position is the median over this long (seconds) before the stroke.
const REST_WINDOW = 0.4;
// The hands must go back at least this far for a stroke to count. Down the
// line it's how much the hands rise going back, which is tiny (~0.5 in on real
// putts, and the start of it barely shows), so there the clearer rise into the
// finish is checked too.
const MIN_BACKSTROKE: Record<PuttView, number> = { "face-on": 0.03, "down-the-line": 0.01 };
const MIN_FINISH_RISE = 0.05;
// Takeaway: the hands have moved this share of the way to the end of the
// backstroke. Down the line the hands' movement is smaller and noisier, so
// a bigger share is needed to be sure.
const TAKEAWAY_SHARE: Record<PuttView, number> = { "face-on": 0.1, "down-the-line": 0.2 };
// Once the hands are clearly moving, the takeaway is traced back to the last
// frame where they were still this close to their rest spot (share of the
// backstroke length; bigger down the line, where tracking is noisier).
const NEAR_REST: Record<PuttView, number> = { "face-on": 0.03, "down-the-line": 0.08 };
// Setup is shown this many seconds before the takeaway, with the putter at
// rest. Down the line the takeaway is found late (see REST_RANGE), so more.
const SETUP_LEAD: Record<PuttView, number> = { "face-on": 0.2, "down-the-line": 0.35 };
// The hands pause at the end of the backstroke; frames within this share of
// the backstroke length from the furthest point count as that pause.
const PAUSE_SHARE = 0.1;
// Finish: the hands are within this share of their furthest point through.
const FINISH_SHARE = 0.05;
// How far back from the forward stroke to look for the backstroke (seconds).
const SEARCH_BACK = 2.5;
// Tracking noise to ignore when looking for the end of the backstroke (torso lengths).
const CLIMB_NOISE = 0.008;
// The forward stroke (face on) or follow-through rise (down the line) must be
// at least this fast.
const MIN_STROKE_SPEED = 0.3;
const MIN_RISE_SPEED = 0.2;
// Down the line: the hands at rest stay within this height range (torso
// lengths) over REST_SPAN seconds. Their speed can't be used there: the start
// of a backstroke barely changes their height, so it's as slow as jitter.
const REST_RANGE = 0.015;
const REST_SPAN = 0.2;
// During a putt the head stays put; more than this (torso lengths) between
// the takeaway and the finish means it's something else, like standing up.
const MAX_HEAD_MOVE = 0.2;
// Down the line: the hands must dip at least this much at the bottom of the
// arc (impact) between the end of the backstroke and the finish.
const MIN_DIP = 0.012;

/**
 * Find Setup, End of backstroke, Impact and Finish from the hands.
 * - Face on: the hands' position along the target line. They go back, pause,
 *   come through the setup spot (impact) and carry on to the finish.
 * - Down the line: the stroke goes toward and away from the camera, so we
 *   use the hands' height instead. A pendulum's hands rise at both ends of
 *   the stroke and are lowest at the bottom (impact).
 */
export function detectPuttMoments(track: PoseTrack): PuttMoments | null {
  const path = handPath(track);
  if (path.length < 5) return null;
  const ruler = bodyRuler(track);
  return detectView(track) === "face-on" ? faceOn(path, ruler) : downTheLine(path, ruler);
}

/**
 * The stroke signal: how far "back" the hands are. Face on: along the target
 * line (forward = positive). Down the line: the hands' height (up = positive).
 */
export function strokeSignal(path: HandSample[], ruler: number, view: PuttView, forward = 1): number[] {
  // Down the line the hands rise going back, so "back" is up (lower = further back).
  return path.map(({ hands }) => (view === "face-on" ? (hands.x / ruler) * forward : hands.y / ruler));
}

/**
 * When the hands start back: they've clearly moved (TAKEAWAY_SHARE of the way
 * to the end of the backstroke), traced back to the last frame they were
 * still at their setup spot. `s` measures how far back the hands are (lower
 * = further back), so the backstroke moves it below `rest`.
 */
function takeawayIndex(s: number[], view: PuttView, rest: number, from: number, back: number) {
  const length = rest - s[back];
  let i = firstIndex(s, from, back, (v) => rest - v > length * TAKEAWAY_SHARE[view]);
  if (i < 0) return from;
  while (i > from && rest - s[i - 1] > length * NEAR_REST[view]) i--;
  return Math.max(i - 1, from);
}

/** The takeaway for given Setup and End of backstroke times (used by the results). */
export function takeawayTime(path: HandSample[], s: number[], view: PuttView, setup: number, backstroke: number) {
  const from = nearestIndex(path, setup);
  const back = nearestIndex(path, backstroke);
  const rest = median(s.filter((_, i) => Math.abs(path[i].time - setup) <= 0.1));
  return path[takeawayIndex(s, view, rest, from, back)].time;
}

function faceOn(path: HandSample[], ruler: number): PuttMoments | null {
  const x = path.map(({ hands }) => hands.x / ruler);
  const vx = derivative(path, x);
  // The forward stroke is the fastest part of the putt; its direction tells
  // us where the target is. Try the fastest movements in turn (walking away
  // afterwards can be faster) until one fits a stroke.
  for (const fast of peaks(vx.map(Math.abs), MIN_STROKE_SPEED)) {
    const found = faceOnStroke(path, ruler, x, fast, Math.sign(vx[fast]));
    if (found) return found;
  }
  return null;
}

function faceOnStroke(path: HandSample[], ruler: number, x: number[], fast: number, forward: number): PuttMoments | null {
  const s = x.map((v) => v * forward);

  // End of backstroke: the furthest point back before the forward stroke.
  const back = climbBack(path, s.map((v) => -v), fast);
  const rest = restBefore(path, s, back);
  if (!rest || rest.value - s[back] < MIN_BACKSTROKE["face-on"]) return null;
  const length = rest.value - s[back];

  const takeaway = takeawayIndex(s, "face-on", rest.value, rest.index, back);

  // Impact: the hands come back through their setup spot.
  const cross = firstIndex(s, back, path.length - 1, (v) => v >= rest.value);
  if (cross <= 0) return null;
  const [a, b] = [s[cross - 1], s[cross]];
  const t = b === a ? 1 : (rest.value - a) / (b - a);
  const impact = path[cross - 1].time + t * (path[cross].time - path[cross - 1].time);
  // The pause at the end of the backstroke runs until the hands finally
  // leave it for impact (tracking can wobble out of it and back in between).
  const pause = pauseAround(s, back, takeaway, cross, (v) => v - s[back] <= length * PAUSE_SHARE);

  const finish = Math.max(finishTime(path, s, nearestIndex(path, impact), rest.value, length), impact);
  if (!headSteady(path, ruler, takeaway, finish)) return null;
  return {
    setup: Math.max(path[0].time, path[takeaway].time - SETUP_LEAD["face-on"]),
    backstroke: (path[pause.first].time + path[pause.last].time) / 2,
    impact,
    finish,
  };
}

function downTheLine(path: HandSample[], ruler: number): PuttMoments | null {
  const h = path.map(({ hands }) => -hands.y / ruler); // height, up = positive
  const vh = derivative(path, h);
  // The follow-through is the fastest rise of the hands. Try the fastest
  // rises in turn until one fits the pattern: rise (backstroke), dip (impact),
  // rise (finish), with the head staying put (standing up afterwards also
  // makes the hands rise).
  for (const rise of peaks(vh, MIN_RISE_SPEED)) {
    const t = path[rise].time;
    const bottom = argmin(h, (i) => i <= rise && path[i].time >= t - 0.6);
    const back = climbBack(path, h, bottom);
    if (h[back] - h[bottom] < MIN_DIP) continue;
    // Measured as "how far back", like face on: the end of the backstroke is the lowest value.
    const s = h.map((v) => -v);
    const rest = restByLevel(path, s, back);
    if (!rest || rest.value - s[back] < MIN_BACKSTROKE["down-the-line"]) continue;
    const length = rest.value - s[back];

    const takeaway = takeawayIndex(s, "down-the-line", rest.value, rest.index, back);
    const pause = pauseAround(s, back, takeaway, bottom, (v) => v - s[back] <= length * PAUSE_SHARE);
    // Impact: the middle of the lowest part of the arc.
    const dip = h[back] - h[bottom];
    const low = pauseAround(h, bottom, pause.last, rise, (v) => v - h[bottom] <= dip * 0.15);
    const impact = (path[low.first].time + path[low.last].time) / 2;
    const finish = Math.max(finishTime(path, h, bottom, h[bottom], dip), impact);
    if (h[nearestIndex(path, finish)] - h[bottom] < MIN_FINISH_RISE) continue;
    if (!headSteady(path, ruler, takeaway, finish)) continue;
    return {
      setup: Math.max(path[0].time, path[takeaway].time - SETUP_LEAD["down-the-line"]),
      backstroke: (path[pause.first].time + path[pause.last].time) / 2,
      impact,
      finish,
    };
  }
  return null;
}

/**
 * Walking back from `from`, the nearest peak of `v`: keep climbing, and stop
 * once `v` falls well below the best so far (back toward where the hands
 * rested). This finds the end of the backstroke rather than some higher point
 * earlier in the clip, like the golfer settling in.
 */
function climbBack(path: HandSample[], v: number[], from: number) {
  let best = from;
  for (let i = from - 1; i >= 0 && path[i].time >= path[from].time - SEARCH_BACK; i--) {
    if (v[i] > v[best]) best = i;
    else if (v[best] - v[i] > Math.max(CLIMB_NOISE, (v[best] - v[from]) * 0.5)) break;
  }
  return best;
}

/** Local peaks of `v` above `min`, biggest first. */
function peaks(v: number[], min: number) {
  return v
    .map((_, i) => i)
    .filter((i) => v[i] > min && v[i] >= (v[i - 1] ?? -Infinity) && v[i] >= (v[i + 1] ?? -Infinity))
    .sort((a, b) => v[b] - v[a]);
}

/** The head stays near where it was from the takeaway to the finish (it doesn't for standing up or walking off). */
function headSteady(path: HandSample[], ruler: number, from: number, finish: number) {
  const start = path[from].head;
  return path
    .filter((p, i) => i >= from && p.time <= finish)
    .every((p) => Math.hypot(p.head.x - start.x, p.head.y - start.y) / ruler <= MAX_HEAD_MOVE);
}

/**
 * Where the hands rested before the backstroke: walking back from the end of
 * the backstroke to the first spell of still hands. Returns the index where
 * that spell ends and the hands' median position during it.
 */
function restBefore(path: HandSample[], s: number[], back: number) {
  // Over a short span, so frame-to-frame tracking jitter doesn't count as movement.
  const speed = derivative(path, s, SPEED_SPAN).map(Math.abs);
  for (let i = back; i > 0; i--) {
    const spell = path.map((_, k) => k).filter((k) => k <= i && path[k].time >= path[i].time - STILL_SECONDS);
    if (path[i].time - path[0].time < STILL_SECONDS) break;
    if (spell.every((k) => speed[k] < STILL_SPEED)) {
      const window = path.map((_, k) => k).filter((k) => k <= i && path[k].time >= path[i].time - REST_WINDOW);
      return { index: i, value: median(window.map((k) => s[k])) };
    }
  }
  return null;
}

/**
 * Down the line: the latest spell before the backstroke where the hands held a
 * steady height, clearly below the end of the backstroke (the pause at the
 * end of the backstroke is steady too, so it's skipped).
 */
function restByLevel(path: HandSample[], s: number[], back: number) {
  for (let i = back; i > 0; i--) {
    if (path[i].time - path[0].time < REST_SPAN) break;
    const window = path.map((_, k) => k).filter((k) => k <= i && path[k].time >= path[i].time - REST_SPAN);
    const values = window.map((k) => s[k]);
    const level = median(values);
    if (Math.max(...values) - Math.min(...values) <= REST_RANGE && level - s[back] >= MIN_BACKSTROKE["down-the-line"]) {
      return { index: i, value: level };
    }
  }
  return null;
}

/** First and last frames around `center` (between `from` and `to`) that pass `near`. */
function pauseAround(s: number[], center: number, from: number, to: number, near: (v: number) => boolean) {
  let first = center;
  let last = center;
  for (let i = Math.max(from, 0); i < center; i++) {
    if (near(s[i])) {
      first = i;
      break;
    }
  }
  for (let i = center + 1; i < Math.min(to, s.length); i++) if (near(s[i])) last = i;
  return { first, last };
}

/** When the hands reach (nearly) their furthest point through, after impact. */
function finishTime(path: HandSample[], s: number[], impact: number, rest: number, length: number) {
  let best = impact;
  for (let i = impact; i < s.length && path[i].time <= path[impact].time + 1.5; i++) {
    if (s[i] > s[best]) best = i;
    // The hands came well back again: the stroke is over.
    else if (s[best] - s[i] > Math.max(s[best] - rest, length) * 0.3) break;
  }
  const done = firstIndex(s, impact, best, (v) => s[best] - v <= (s[best] - rest) * FINISH_SHARE);
  return path[done >= 0 ? done : best].time;
}

/** Rate of change, comparing frames about `span` seconds apart (at least neighbors). */
function derivative(path: HandSample[], v: number[], span = 0) {
  return v.map((_, i) => {
    let a = Math.max(0, i - 1);
    let b = Math.min(v.length - 1, i + 1);
    while (a > 0 && path[i].time - path[a].time < span / 2) a--;
    while (b < v.length - 1 && path[b].time - path[i].time < span / 2) b++;
    const dt = path[b].time - path[a].time;
    return dt > 0 ? (v[b] - v[a]) / dt : 0;
  });
}

function argmax(v: number[], allowed: (i: number) => boolean = () => true) {
  let best = -1;
  for (let i = 0; i < v.length; i++) if (allowed(i) && (best < 0 || v[i] > v[best])) best = i;
  return Math.max(best, 0);
}

function argmin(v: number[], allowed: (i: number) => boolean = () => true) {
  return argmax(v.map((x) => -x), allowed);
}

function firstIndex(v: number[], from: number, to: number, test: (x: number) => boolean) {
  for (let i = Math.max(from, 0); i <= Math.min(to, v.length - 1); i++) if (test(v[i])) return i;
  return -1;
}

function nearestIndex(path: HandSample[], time: number) {
  return argmin(path.map((p) => Math.abs(p.time - time)));
}
