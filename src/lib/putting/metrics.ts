import { ANALYSIS_CONFIG } from "@/config/analysisConfig";
import { angleDegrees } from "../shapes";
import { poseAround, poseAt } from "../pose/skeleton";
import { LM, distance, handsPosition, headCenter, mid, px, torsoLength, type Landmark, type PoseTrack, type Px } from "../pose/landmarks";
import type { CameraAngle } from "../pose/autoAids";
import {
  grade,
  inches,
  inchesShort,
  issue,
  rate,
  strength,
  handsVisibility,
  visibilityOf,
  withIssue,
  type Finding,
  type Rating,
  type Severity,
} from "../analysis/findings";
import { strokeSignal, takeawayTime, type PuttMoments } from "./moments";
import { feetMid, fromFeet, handPath, median, pendulumChange, samples } from "./stroke";

const CFG = ANALYSIS_CONFIG;
const PUTT = CFG.putting;

type Input = {
  track: PoseTrack;
  moments: PuttMoments;
  angle: CameraAngle;
  ball: Px | null; // found in the setup frame (down the line only)
};

/**
 * Putting results. Face on shows the stroke itself (tempo, length, the
 * pendulum); down the line shows the path and where the eyes are. Both show
 * head and lower body stillness. Biggest issues first.
 */
export function analyzePutt(input: Input): { findings: Finding[]; pxPerInch: number } | null {
  const c = makeContext(input);
  if (!c) return null;
  const checks: ((c: Context) => Finding | null)[] =
    input.angle === "face-on"
      ? [tempo, strokeLength, acceleration, head, lowerBody, triangle, shoulderRock]
      : [head, lowerBody, strokePath, eyesOverBall];
  const findings = checks.map((check) => check(c)).filter((f): f is Finding => f !== null);
  const rank = (f: Finding) => (f.status === "strength" ? 2 : f.severity === "major" ? 0 : 1);
  return { findings: findings.sort((a, b) => rank(a) - rank(b) || b.score - a.score), pxPerInch: c.pxPerInch };
}

type Context = Input & {
  setup: Landmark[];
  impact: Landmark[];
  pxPerInch: number;
  confident: (poses: Landmark[][], points: number[]) => boolean;
};

function makeContext(input: Input): Context | null {
  // Each key position is the average of the frames around it.
  const setup = poseAround(input.track, input.moments.setup, CFG.keyPoseWindow.address);
  const impact = poseAround(input.track, input.moments.impact, CFG.keyPoseWindow.impact);
  if (!setup || !impact) return null;
  return {
    ...input,
    setup,
    impact,
    // Pixels per inch, using the golfer's own torso as a ruler.
    pxPerInch: torsoLength(setup, input.track) / CFG.torsoInches,
    confident: (poses, points) => {
      const values = poses.flatMap((lms) => points.map((i) => lms[i].visibility));
      return values.reduce((s, v) => s + v, 0) / values.length >= CFG.minConfidence;
    },
  };
}

const HEAD = [LM.nose, LM.leftEar, LM.rightEar];
const FEET = [LM.leftAnkle, LM.rightAnkle];
const SHOULDERS = [LM.leftShoulder, LM.rightShoulder];
const HANDS = [LM.leftWrist, LM.rightWrist, LM.leftIndex, LM.rightIndex];
// Pendulum angles jump around a little from frame to frame (the finger points
// on the grip especially), so each one is the median over this window.
const SMOOTHING = 0.1; // seconds either side

// ---------- Tempo (face on) ----------

function tempo(c: Context): Finding | null {
  const { track, moments } = c;
  const path = handPath(track, moments.setup - 0.2, moments.impact);
  if (path.length < 3) return null;
  const forward = Math.sign(atTime(path, moments.impact).x - atTime(path, moments.backstroke).x) || 1;
  const signal = strokeSignal(path, 1, "face-on", forward);
  const takeaway = takeawayTime(path, signal, "face-on", moments.setup, moments.backstroke);
  const back = moments.backstroke - takeaway;
  const through = moments.impact - moments.backstroke;
  if (back <= 0 || through <= 0) return null;

  const ratio = back / through;
  const t = PUTT.tempo;
  const r = ratio.toFixed(1);
  const rating: Rating = {
    label: "your putting tempo",
    metric: "puttTempo",
    visibility: handsVisibility([c.setup, c.impact]),
    value: ratio,
    thresholds: [t.goodMin, t.goodMax],
  };
  const detail = `Backstroke ${back.toFixed(2)}s, forward stroke ${through.toFixed(2)}s: ${r} to 1 (good putters are close to ${t.ideal} to 1).`;
  if (ratio >= t.goodMin && ratio <= t.goodMax) {
    return rate(rating, strength(
      "tempo",
      `Smooth stroke rhythm: ${r} to 1`,
      detail,
      `Your putter goes back for ${back.toFixed(2)}s and comes through in ${through.toFixed(2)}s, the steady back-and-through rhythm that makes distance repeatable.`,
      moments.backstroke,
      "handPath",
    ));
  }
  const severity: Severity = ratio < t.okMin || ratio > t.okMax ? "major" : "minor";
  const score = ratio < t.goodMin ? t.goodMin / ratio : ratio / t.goodMax;
  return rate(rating, withIssue(
    "putt-tempo",
    ratio < t.goodMin
      ? issue(
          "tempo",
          severity,
          score,
          `Quick backstroke (${r} to 1)`,
          detail,
          `Your backstroke takes only ${back.toFixed(2)}s against a ${through.toFixed(2)}s forward stroke. Snatching it back makes the hit at the ball the thing that sets distance, which is why lag putts come up long or short.`,
          moments.backstroke,
          "handPath",
        )
      : issue(
          "tempo",
          severity,
          score,
          `Forward stroke drags (${r} to 1)`,
          detail,
          `A ${through.toFixed(2)}s forward stroke after a ${back.toFixed(2)}s backstroke means the putter is easing into the ball, and a slowing putter face twists open or closed.`,
          moments.backstroke,
          "handPath",
        ),
  ));
}

// ---------- Stroke length (face on) ----------

/**
 * How far the hands went back and through along the target line, in inches,
 * plus where (in video pixels) for the stroke length aid.
 */
export function strokeLengths(track: PoseTrack, moments: PuttMoments) {
  const setup = poseAt(track, moments.setup);
  if (!setup) return null;
  const ppi = torsoLength(setup, track) / CFG.torsoInches;
  const path = handPath(track, moments.setup - 0.1, moments.finish + 0.3);
  if (path.length < 3) return null;
  const start = atTime(path, moments.setup);
  const forward = Math.sign(atTime(path, moments.impact).x - atTime(path, moments.backstroke).x) || 1;
  const along = (p: Px) => (p.x - start.x) * forward;
  const before = path.filter((p) => p.time <= moments.impact);
  const after = path.filter((p) => p.time >= moments.impact);
  if (before.length === 0 || after.length === 0) return null;
  const back = before.reduce((a, b) => (along(b.hands) < along(a.hands) ? b : a));
  const through = after.reduce((a, b) => (along(b.hands) > along(a.hands) ? b : a));
  // Back to picture coordinates, from where the feet were at setup.
  const feet = feetMid(setup, track);
  return {
    backInches: Math.max(0, -along(back.hands)) / ppi,
    throughInches: Math.max(0, along(through.hands)) / ppi,
    backTime: back.time,
    throughTime: through.time,
    setupX: start.x + feet.x,
    backX: back.hands.x + feet.x,
    throughX: through.hands.x + feet.x,
    handsY: handsPosition(setup, track).y,
  };
}

function strokeLength(c: Context): Finding | null {
  const { track, moments, setup } = c;
  if (!c.confident([setup], [...HANDS, ...FEET])) return null;
  const l = strokeLengths(track, moments);
  if (!l || l.backInches < 1) return null;
  const ratio = l.throughInches / l.backInches;
  const detail = `Backstroke ${inches(l.backInches)}, follow-through ${inches(l.throughInches)} (${Math.round(ratio * 100)}% as long).`;
  const { short, long } = PUTT.strokeLengthRatio;
  const rating: Rating = {
    phase: "finish",
    label: "your stroke length",
    metric: "strokeLength",
    visibility: handsVisibility([setup]),
    value: ratio,
    thresholds: [short.minor, long.minor],
  };
  if (ratio < short.minor) {
    return rate(rating, withIssue("putt-length", issue(
      "stroke-length",
      ratio < short.major ? "major" : "minor",
      short.minor / Math.max(ratio, 0.1),
      `Short follow-through (${Math.round(ratio * 100)}% of the backstroke)`,
      detail,
      `Your hands went back ${inches(l.backInches)} but only ${inches(l.throughInches)} through. Stopping short like that means the putter was slowing down at the ball.`,
      l.throughTime,
      "strokeLength",
    )));
  }
  if (ratio > long.minor) {
    return rate(rating, withIssue("putt-length", issue(
      "stroke-length",
      ratio > long.major ? "major" : "minor",
      ratio / long.minor,
      `Backstroke much shorter than the follow-through (${inchesShort(l.backInches)} back)`,
      detail,
      `Only ${inches(l.backInches)} back for ${inches(l.throughInches)} through means you're jabbing at the ball to make up the speed, which is hard to repeat.`,
      l.backTime,
      "strokeLength",
    )));
  }
  return rate(rating, strength(
    "stroke-length",
    "Follow-through matches the backstroke",
    detail,
    `${inches(l.backInches)} back and ${inches(l.throughInches)} through is the even, pendulum-like length that lets the putter swing instead of hit.`,
    l.throughTime,
    "strokeLength",
  ));
}

/**
 * Face on: accelerating through impact. The hands' speed along the target
 * line during the forward stroke: a good stroke is still speeding up (or at
 * its fastest) at impact; a decelerating one peaks early and arrives slower.
 */
function acceleration(c: Context): Finding | null {
  const { track, moments, setup } = c;
  if (!c.confident([setup, c.impact], HANDS)) return null;
  const path = handPath(track, moments.backstroke, moments.finish);
  if (path.length < 6) return null;
  const forward = Math.sign(atTime(path, moments.impact).x - atTime(path, moments.backstroke).x) || 1;
  // Speed along the target line, from neighboring frames, in inches per second.
  const speeds = path.slice(1, -1).map((p, i) => ({
    time: p.time,
    speed: (((path[i + 2].hands.x - path[i].hands.x) * forward) / (path[i + 2].time - path[i].time)) / c.pxPerInch,
  }));
  const before = speeds.filter((s) => s.time <= moments.impact + 0.01);
  if (before.length < 3) return null;
  const peak = before.reduce((a, b) => (b.speed > a.speed ? b : a));
  const atImpact = speeds.reduce((a, b) => (Math.abs(b.time - moments.impact) < Math.abs(a.time - moments.impact) ? b : a));
  if (peak.speed <= 0) return null;
  const share = Math.min(1, atImpact.speed / peak.speed);
  const early = moments.impact - peak.time;
  const detail = `Top hand speed ${Math.round(peak.speed)} in/s, ${early > 0.01 ? `${Math.round(early * 1000)} ms before impact` : "at impact"}; at impact ${Math.round(atImpact.speed)} in/s (${Math.round(share * 100)}% of top speed).`;
  const L = PUTT.impactSpeedShare;
  const rating: Rating = {
    phase: "impact",
    label: "your acceleration through the ball",
    metric: "acceleration",
    visibility: handsVisibility([setup, c.impact]),
    value: share,
    thresholds: [L.minor],
  };
  if (early > PUTT.peakBeforeSeconds && share < L.minor) {
    return rate(rating, withIssue("putt-decel", issue(
      "acceleration",
      share < L.major ? "major" : "minor",
      L.minor / Math.max(share, 0.1),
      `Decelerating: ${Math.round((1 - share) * 100)}% slower at impact than at top speed`,
      detail,
      `Your hands were fastest ${Math.round(early * 1000)} ms before impact and had already slowed to ${Math.round(share * 100)}% of that by the ball. A putter that's slowing down at contact lets the face twist and makes speed hard to judge.`,
      peak.time,
      "handPath",
    )));
  }
  return rate(rating, strength(
    "acceleration",
    "Accelerating through the ball",
    detail,
    `Your hands were still at ${Math.round(share * 100)}% of their top speed at impact, so the putter swung through the ball instead of stopping at it.`,
    moments.impact,
    "handPath",
  ));
}

// ---------- Stillness (both angles) ----------

function head(c: Context): Finding | null {
  const { track, moments, setup, impact, pxPerInch } = c;
  if (!c.confident([setup, impact], [...HEAD, ...FEET])) return null;
  const at = (lms: Landmark[]) => fromFeet(lms, track, headCenter(lms, track));
  const moved = distance(at(setup), at(impact)) / pxPerInch;
  const detail = `Your head moved ${inches(moved)} from setup to impact (measured from your feet, so camera wobble doesn't count).`;
  const rating: Rating = {
    phase: "impact",
    label: "your head",
    metric: "puttHead",
    visibility: visibilityOf([setup, impact], HEAD),
    value: moved,
    thresholds: [PUTT.headMovementInches.minor],
  };
  const g = grade(moved, PUTT.headMovementInches);
  if (g) {
    return rate(rating, withIssue("putt-stillness", issue(
      "head",
      g,
      moved / PUTT.headMovementInches.minor,
      `Head moves ${inchesShort(moved)} during the stroke`,
      detail,
      `Your head shifted ${inches(moved)} before the ball was struck, and your shoulders go with it, which swings the putter off the line you set up on.`,
      moments.impact,
      "puttHead",
    )));
  }
  return rate(rating, strength(
    "head",
    "Head stayed still",
    detail,
    "Your head stayed in its box through impact, so the shoulders could rock around a fixed point.",
    moments.impact,
    "puttHead",
  ));
}

function lowerBody(c: Context): Finding | null {
  const { track, moments, setup, impact, pxPerInch } = c;
  const points = [LM.leftHip, LM.rightHip, LM.leftKnee, LM.rightKnee];
  if (!c.confident([setup, impact], [...points, ...FEET])) return null;
  const at = (lms: Landmark[]) =>
    fromFeet(lms, track, mid(mid(px(lms, LM.leftHip, track), px(lms, LM.rightHip, track)), mid(px(lms, LM.leftKnee, track), px(lms, LM.rightKnee, track))));
  const start = at(setup);
  let worst = { move: 0, time: moments.impact };
  for (const f of samples(track, moments.setup, moments.impact)) {
    const move = distance(at(f.lms), start) / pxPerInch;
    if (move > worst.move) worst = { move, time: f.time };
  }
  const detail = `Your hips and knees moved up to ${inches(worst.move)} during the stroke.`;
  const rating: Rating = {
    phase: "forward",
    label: "your lower body",
    metric: "puttLowerBody",
    visibility: visibilityOf([setup, impact], points),
    value: worst.move,
    thresholds: [PUTT.lowerBodyMovementInches.minor],
  };
  const g = grade(worst.move, PUTT.lowerBodyMovementInches);
  if (g) {
    return rate(rating, withIssue("putt-stillness", issue(
      "lower-body",
      g,
      worst.move / PUTT.lowerBodyMovementInches.minor,
      `Lower body sways ${inchesShort(worst.move)}`,
      detail,
      `Your hips and knees moved ${inches(worst.move)} during a stroke that should only move the shoulders and arms, which carries the putter off its arc and changes where you strike the ball.`,
      worst.time,
      "lowerBody",
    )));
  }
  return rate(rating, strength(
    "lower-body",
    "Lower body stayed quiet",
    detail,
    "Your legs and hips stayed put, giving the stroke a stable base.",
    worst.time,
    "lowerBody",
  ));
}

// ---------- The pendulum (face on) ----------

/** The pendulum angles (and the lead wrist) over the stroke, each smoothed with a short median. */
function pendulumSeries(c: Context, from: number, to: number) {
  const lead = leadSide(c);
  const raw = samples(c.track, from - SMOOTHING, to + SMOOTHING).map((f) => ({
    time: f.time,
    ...pendulumChange(c.setup, f.lms, c.track),
    wrist: angleDegrees(px(f.lms, lead.elbow, c.track), px(f.lms, lead.wrist, c.track), px(f.lms, lead.index, c.track)),
  }));
  return raw
    .filter((r) => r.time >= from - 1e-6 && r.time <= to + 1e-6)
    .map((r) => {
      const near = raw.filter((q) => Math.abs(q.time - r.time) <= SMOOTHING + 1e-6);
      return {
        time: r.time,
        shoulders: median(near.map((q) => q.shoulders)),
        arms: median(near.map((q) => q.arms)),
        triangle: median(near.map((q) => q.triangle)),
        wrist: median(near.map((q) => q.wrist)),
      };
    });
}

/**
 * Face on: the lead arm is on the target side. The hands go back away from
 * the target, so the target is the way they come through.
 */
function leadSide(c: Context) {
  const { track, moments } = c;
  const back = handsPosition(poseAt(track, moments.backstroke) ?? c.setup, track).x;
  const through = handsPosition(c.impact, track).x;
  const towardTarget = Math.sign(through - back) || 1;
  // MediaPipe's "left" is the golfer's left. Facing the camera, the golfer's
  // left is on the right of the picture.
  const leftOnScreen = Math.sign(px(c.setup, LM.leftShoulder, track).x - px(c.setup, LM.rightShoulder, track).x) || 1;
  return leftOnScreen === towardTarget
    ? { elbow: LM.leftElbow, wrist: LM.leftWrist, index: LM.leftIndex }
    : { elbow: LM.rightElbow, wrist: LM.rightWrist, index: LM.rightIndex };
}

/**
 * Wrist breakdown, especially through impact: the pendulum triangle changing
 * shape (arms and hands moving on their own), or the lead wrist hinging.
 */
function triangle(c: Context): Finding | null {
  const { moments, setup, impact } = c;
  if (!c.confident([setup, impact], [...SHOULDERS, ...HANDS])) return null;
  const series = pendulumSeries(c, moments.setup, moments.impact + 0.15);
  if (series.length === 0) return null;
  // Changes are measured from setup (smoothed the same way).
  const base = series[0];
  const worstIn = (key: "triangle" | "wrist", from: number, to: number) =>
    series
      .filter((s) => s.time >= from && s.time <= to)
      .reduce((w, s) => (Math.abs(s[key] - base[key]) > w.change ? { change: Math.abs(s[key] - base[key]), time: s.time } : w), {
        change: 0,
        time: from,
      });
  const allowance = PUTT.backstrokeAllowance;
  // Each measure as a share of its minor limit: through impact counts in full,
  // the backstroke gets a little more room. The biggest one decides.
  const parts = (["triangle", "wrist"] as const).flatMap((key) => {
    const limits = key === "triangle" ? PUTT.triangleChangeDegrees : PUTT.leadWristChangeDegrees;
    const back = worstIn(key, moments.setup, moments.backstroke);
    const through = worstIn(key, moments.backstroke, moments.impact + 0.15);
    return [
      { key, where: "through impact", ...through, value: through.change, limits },
      { key, where: "in the backstroke", ...back, value: back.change / allowance, limits },
    ];
  });
  const worst = parts.reduce((a, b) => (b.value / b.limits.minor > a.value / a.limits.minor ? b : a));
  const throughOf = (key: "triangle" | "wrist") => Math.round(parts.find((p) => p.key === key && p.where === "through impact")!.change);
  const backOf = (key: "triangle" | "wrist") => Math.round(parts.find((p) => p.key === key && p.where !== "through impact")!.change);
  const detail = `Through impact, the triangle between your shoulders and hands changed shape by up to ${throughOf("triangle")}° and your lead wrist angle by up to ${throughOf("wrist")}° (backstroke: ${backOf("triangle")}° and ${backOf("wrist")}°).`;
  const rating: Rating = {
    phase: worst.where === "through impact" ? "impact" : "backstroke",
    label: "your wrists",
    metric: "triangle",
    visibility: visibilityOf([setup, impact], [...SHOULDERS, ...HANDS]),
    value: worst.value,
    thresholds: [worst.limits.minor],
  };
  const g = grade(worst.value, worst.limits);
  if (g) {
    return rate(rating, withIssue("wrist-breakdown", issue(
      "triangle",
      g,
      worst.value / worst.limits.minor,
      worst.key === "wrist"
        ? `Lead wrist breaks down ${worst.where} (${Math.round(worst.change)}°)`
        : `Hands break the triangle ${worst.where} (${Math.round(worst.change)}°)`,
      detail,
      worst.key === "wrist"
        ? `Your lead wrist angle changed ${Math.round(worst.change)}° ${worst.where}. Each degree of hinge adds loft and turns the face, so the ball comes off the putter differently every time.`
        : `Your hands moved ${Math.round(worst.change)}° away from where the rocking shoulders would carry them ${worst.where}, so the arms are adding their own swing on top of the pendulum.`,
      worst.time,
      "triangle",
    )));
  }
  return rate(rating, strength(
    "triangle",
    "Pendulum triangle held its shape",
    detail,
    `The triangle changed by no more than ${throughOf("triangle")}° through impact, so the shoulders carried the putter without the wrists adding a flick.`,
    parts[0].time,
    "triangle",
  ));
}

/** Shoulders doing the work: how much of the hands' swing comes from the shoulders rocking. */
function shoulderRock(c: Context): Finding | null {
  const { moments, setup, impact } = c;
  if (!c.confident([setup, impact], [...SHOULDERS, ...HANDS])) return null;
  const series = pendulumSeries(c, moments.setup, moments.finish);
  if (series.length === 0) return null;
  const base = series[0];
  const at = (time: number) => series.reduce((a, b) => (Math.abs(b.time - time) < Math.abs(a.time - time) ? b : a));
  // At both ends of the stroke: shoulder rock ÷ arm swing, weighted by how far the arms swung.
  let rocked = 0;
  let swung = 0;
  for (const s of [at(moments.backstroke), at(moments.finish)]) {
    const arms = s.arms - base.arms;
    const shoulders = s.shoulders - base.shoulders;
    swung += Math.abs(arms);
    rocked += Math.max(0, Math.sign(arms) * shoulders); // rocking the wrong way doesn't count
  }
  if (swung < 3) return null; // too small a stroke to judge
  const share = Math.min(1, rocked / swung);
  const pct = Math.round(share * 100);
  const detail = `About ${pct}% of your hands' swing came from your shoulders rocking (100% is a perfect pendulum).`;
  const t = PUTT.shoulderRockShare;
  const rating: Rating = {
    phase: "backstroke",
    label: "your shoulder rock",
    metric: "shoulderRock",
    visibility: visibilityOf([setup, impact], [...SHOULDERS, ...HANDS]),
    value: share,
    thresholds: [t.minor],
  };
  if (share < t.minor) {
    return rate(rating, withIssue("shoulder-rock", issue(
      "shoulders",
      share < t.major ? "major" : "minor",
      t.minor / Math.max(share, 0.1),
      `Arms do the work: shoulders give only ${pct}% of the swing`,
      detail,
      `Only ${pct}% of the putter's swing came from your shoulders; the rest is your arms and hands moving on their own, which is much harder to repeat under pressure.`,
      moments.backstroke,
      "shoulders",
    )));
  }
  return rate(rating, strength(
    "shoulders",
    "Shoulders rocked the putter",
    detail,
    `${pct}% of the putter's swing came from your shoulders rocking, the most repeatable way to move it.`,
    moments.backstroke,
    "shoulders",
  ));
}

// ---------- Down the line ----------

/** Which way the ball is from the golfer on screen (+1 = right). */
function ballSide(c: Context) {
  const hips = mid(px(c.setup, LM.leftHip, c.track), px(c.setup, LM.rightHip, c.track));
  return Math.sign(handsPosition(c.setup, c.track).x - hips.x) || 1;
}

/** Straight back and through, or a big arc, or cutting across. */
function strokePath(c: Context): Finding | null {
  const { track, moments, setup, pxPerInch } = c;
  // From down the line the far hand is hidden behind the near one, so follow
  // the near hand (wrist and knuckles) only.
  const near =
    setup[LM.leftWrist].visibility + setup[LM.leftIndex].visibility >=
    setup[LM.rightWrist].visibility + setup[LM.rightIndex].visibility
      ? [LM.leftWrist, LM.leftIndex]
      : [LM.rightWrist, LM.rightIndex];
  if (!c.confident([setup], [...near, ...FEET])) return null;
  const handX = (lms: Landmark[]) => fromFeet(lms, track, mid(px(lms, near[0], track), px(lms, near[1], track))).x;
  const frames = samples(track, moments.setup - SMOOTHING, moments.finish + SMOOTHING);
  if (frames.length < 3) return null;
  // Median over a short window: the hand's points jitter from frame to frame.
  const at = (time: number) => median(frames.filter((f) => Math.abs(f.time - time) <= SMOOTHING + 1e-6).map((f) => handX(f.lms)));
  const side = ballSide(c);
  const start = at(moments.setup);
  // Inches the hand moved in toward the body (+) or out toward the ball (−).
  const inward = (time: number) => ((start - at(time)) * side) / pxPerInch;
  const back = inward(moments.backstroke);
  const through = inward(moments.finish);
  const limits = PUTT.strokePathInches;
  const worst = Math.max(Math.abs(back), Math.abs(through));
  const dir = (v: number) => (Math.abs(v) < 0.5 ? "straight" : v > 0 ? `${inches(v)} inside` : `${inches(-v)} outside`);
  const detail = `Your hands went ${dir(back)} at the end of the backstroke and ${dir(through)} at the finish.`;
  const rating: Rating = {
    phase: "forward",
    label: "your stroke path",
    metric: "strokePath",
    visibility: visibilityOf([setup], [...near, ...FEET]),
    value: worst,
    thresholds: [limits.minor],
  };
  const g = grade(worst, limits);
  if (!g) {
    return rate(rating, strength(
      "path",
      "Stroke went straight back and through",
      detail,
      "Your hands stayed on line both ways, so the putter face could stay square to the path.",
      moments.finish,
      "handPath",
    ));
  }
  const crossing = Math.sign(back) !== Math.sign(through) && Math.min(Math.abs(back), Math.abs(through)) > limits.minor / 2;
  const [title, meaning] =
    crossing && back < 0
      ? ["You cut across the ball (outside going back, inside through)", "An out-to-in path pulls putts left of your line (for a right-hander) and adds sidespin."]
      : crossing
        ? ["Your stroke goes inside going back and out through the ball", "An in-to-out path pushes putts right of your line (for a right-hander)."]
        : back > 0 || through > 0
          ? ["Your stroke swings on a big arc", "A big arc opens the face going back and closes it through. Unless the timing is perfect, putts start off line."]
          : ["Your hands move out toward the ball during the stroke", "Pushing the hands out changes the putter's lie and face angle, so putts start off line."];
  return rate(rating, withIssue("putt-path", issue("path", g, worst / limits.minor, title, detail, meaning, Math.abs(back) >= Math.abs(through) ? moments.backstroke : moments.finish, "handPath")));
}

/** Eyes over the ball at setup. */
function eyesOverBall(c: Context): Finding | null {
  const { ball, setup, track, moments, pxPerInch } = c;
  if (!ball || !c.confident([setup], [LM.leftEye, LM.rightEye])) return null;
  const eyes = mid(px(setup, LM.leftEye, track), px(setup, LM.rightEye, track));
  // Positive = eyes outside the ball (beyond it), negative = inside (toward the feet).
  const outside = ((eyes.x - ball.x) * ballSide(c)) / pxPerInch;
  const where = Math.abs(outside) < 0.5 ? "right over the ball" : outside > 0 ? `${inches(outside)} outside the ball` : `${inches(-outside)} inside the ball`;
  const detail = `At setup your eyes were ${where}.`;
  const rating: Rating = {
    phase: "setup",
    label: "your eye line",
    metric: "eyeLine",
    visibility: visibilityOf([setup], [LM.leftEye, LM.rightEye]),
    value: outside,
    thresholds: [-PUTT.eyesInsideBallInches.minor, PUTT.eyesOutsideBallInches.minor],
  };
  const inside = grade(-outside, PUTT.eyesInsideBallInches);
  const beyond = grade(outside, PUTT.eyesOutsideBallInches);
  if (beyond) {
    return rate(rating, withIssue("eye-line", issue(
      "eyes",
      beyond,
      outside / PUTT.eyesOutsideBallInches.minor,
      `Eyes ${inchesShort(outside)} outside the ball`,
      detail,
      `With your eyes ${inches(outside)} beyond the ball you're crowding it: the hands get pushed out and the line looks further right than it is.`,
      moments.setup,
      "eyeLine",
    )));
  }
  if (inside) {
    return rate(rating, withIssue("eye-line", issue(
      "eyes",
      inside,
      -outside / PUTT.eyesInsideBallInches.minor,
      `Eyes ${inchesShort(-outside)} inside the ball`,
      detail,
      `From ${inches(-outside)} inside, the line you see points left of where the putter is really aimed (for a right-hander), so you either aim off or pull it back on line.`,
      moments.setup,
      "eyeLine",
    )));
  }
  return rate(rating, strength(
    "eyes",
    "Eyes over the ball",
    detail,
    "With your eyes over the ball, the line you see is the line the putter is aimed on.",
    moments.setup,
    "eyeLine",
  ));
}

// ---------- Helpers ----------

function atTime(path: { time: number; hands: Px }[], time: number): Px {
  return path.reduce((a, b) => (Math.abs(b.time - time) < Math.abs(a.time - time) ? b : a)).hands;
}
