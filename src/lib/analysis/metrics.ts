import { ANALYSIS_CONFIG } from "@/config/analysisConfig";
import { angleDegrees, tiltFromVertical } from "../shapes";
import { poseAround } from "../pose/skeleton";
import { LM, distance, handsPosition, headCenter, mid, px, torsoLength, type Landmark, type PoseTrack, type Px } from "../pose/landmarks";
import type { CameraAngle } from "../pose/autoAids";
import { CLUB_LEAD, finishTime, takeawayTime, type KeyMoments } from "./keyMoments";
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
  said,
  spoken,
} from "./findings";

type Input = {
  track: PoseTrack;
  moments: KeyMoments;
  angle: CameraAngle;
};

const CFG = ANALYSIS_CONFIG;
const FS = CFG.fullSwing;
const DTL = FS.downTheLine;
const FO = FS.faceOn;

/** The phases of the swing, as times (finish is null if the video ends first). */
export type SwingPhases = {
  setup: number;
  takeaway: number;
  top: number;
  transition: number; // end of the transition, start of the rest of the downswing
  impact: number;
  finish: number | null;
};

/**
 * Turn the pose data of a full swing into golfer-friendly findings (putts
 * have their own checks, see src/lib/putting). Only checks that make sense
 * for the camera angle, and where the body points are detected, are
 * included. Biggest issues first. Confidence, connections between results,
 * the focus and the summary are added afterwards (see report.ts).
 */
export function analyzeSwing(input: Input): { findings: Finding[]; phases: SwingPhases; pxPerInch: number } | null {
  const c = makeContext(input);
  if (!c) return null;
  const checks: ((c: Context) => Finding | null)[] =
    input.angle === "down-the-line"
      ? [tempo, posture, takeaway, trailKnee, leadArmAtTop, plane, earlyExtension, headHeight, finishBalance]
      : [tempo, hipSway, shoulderTurn, reverseTilt, sequencing, weightShift, headLateral, leadArmRelease, finishBalance];
  const findings = checks.map((check) => check(c)).filter((f): f is Finding => f !== null);
  const rank = (f: Finding) => (f.status === "strength" ? 2 : f.severity === "major" ? 0 : 1);
  return { findings: findings.sort((a, b) => rank(a) - rank(b) || b.score - a.score), phases: c.phases, pxPerInch: c.pxPerInch };
}

// ---------- Shared setup ----------

type Context = Input & {
  address: Landmark[];
  top: Landmark[];
  impact: Landmark[];
  phases: SwingPhases;
  pxPerInch: number;
  targetSide: number; // +1 if the target is to the right on screen (face on)
  ballSide: number; // +1 if the ball is to the right of the golfer (down the line)
  lead: { shoulder: number; elbow: number; wrist: number; index: number; hip: number; knee: number; ankle: number };
  trail: { hip: number; knee: number; ankle: number };
  P: (lms: Landmark[], i: number) => Px;
  between: (from: number, to: number) => { time: number; lms: Landmark[] }[];
  confident: (poses: Landmark[][], points: number[], min?: number) => boolean;
};

function makeContext(input: Input): Context | null {
  const { track, moments, angle } = input;
  const W = CFG.keyPoseWindow;
  // Each key position is the average of the frames around it.
  const address = poseAround(track, moments.address, W.address);
  const top = poseAround(track, moments.top, W.top);
  const impact = poseAround(track, moments.impact, W.impact);
  if (!address || !top || !impact) return null;

  const P = (lms: Landmark[], i: number) => px(lms, i, track);
  const hips = (lms: Landmark[]) => mid(P(lms, LM.leftHip), P(lms, LM.rightHip));
  // The hands go back away from the target.
  const targetSide = -Math.sign(handsPosition(top, track).x - handsPosition(address, track).x) || 1;
  // Down the line, the golfer faces the side the hands hang toward.
  const ballSide = Math.sign(handsPosition(address, track).x - hips(address).x) || 1;
  // Right-handed golfers face right when filmed down the line, and have the
  // target on the right of the screen when filmed face on. MediaPipe's "left"
  // is the golfer's own left, which is the lead side for a right-hander.
  const rightHanded = angle === "down-the-line" ? ballSide > 0 : targetSide > 0;
  const left = { shoulder: LM.leftShoulder, elbow: LM.leftElbow, wrist: LM.leftWrist, index: LM.leftIndex, hip: LM.leftHip, knee: LM.leftKnee, ankle: LM.leftAnkle };
  const right = { shoulder: LM.rightShoulder, elbow: LM.rightElbow, wrist: LM.rightWrist, index: LM.rightIndex, hip: LM.rightHip, knee: LM.rightKnee, ankle: LM.rightAnkle };
  const lead = rightHanded ? left : right;
  const trail = rightHanded ? right : left;

  const takeaway = Math.max(moments.address, takeawayTime(track, moments) - CLUB_LEAD);
  const phases: SwingPhases = {
    setup: moments.address,
    takeaway,
    top: moments.top,
    transition: moments.top + (moments.impact - moments.top) * FS.transitionShare,
    impact: moments.impact,
    finish: finishTime(track, moments.impact, FS.finishStillSpeed),
  };

  return {
    ...input,
    address,
    top,
    impact,
    phases,
    // Pixels per inch, using the golfer's own torso as a ruler.
    pxPerInch: torsoLength(address, track) / CFG.torsoInches,
    targetSide,
    ballSide,
    lead,
    trail,
    P,
    between: (from, to) =>
      track.frames
        .filter((f) => f.landmarks && f.time >= from - 1e-6 && f.time <= to + 1e-6)
        .map((f) => ({ time: f.time, lms: f.landmarks! })),
    confident: (poses, points, min = CFG.minConfidence) => visibilityOf(poses, points) >= min,
  };
}

const hipsMid = (c: Context, lms: Landmark[]) => mid(c.P(lms, LM.leftHip), c.P(lms, LM.rightHip));
const shouldersMid = (c: Context, lms: Landmark[]) => mid(c.P(lms, LM.leftShoulder), c.P(lms, LM.rightShoulder));
const spineTilt = (c: Context, lms: Landmark[]) => tiltFromVertical(hipsMid(c, lms), shouldersMid(c, lms));
const bend = (c: Context, lms: Landmark[], a: number, b: number, d: number) =>
  180 - angleDegrees(c.P(lms, a), c.P(lms, b), c.P(lms, d));
const TORSO = [LM.leftShoulder, LM.rightShoulder, LM.leftHip, LM.rightHip];
const HEAD = [LM.nose, LM.leftEar, LM.rightEar];
const HANDS = [LM.leftWrist, LM.rightWrist, LM.leftIndex, LM.rightIndex];

// ---------- Tempo (whole swing) ----------

function tempo(c: Context): Finding | null {
  const { moments, phases } = c;
  // The club reaches the top a moment after the hands stop (see config).
  const clubTop = moments.top + FS.clubTopLagSeconds;
  const back = clubTop - phases.takeaway;
  const down = moments.impact - clubTop;
  if (back <= 0 || down <= 0) return null;
  const ratio = back / down;
  const t = FS.tempo;
  const r = ratio.toFixed(1);
  const rating: Rating = {
    label: "tempo",
    metric: "tempo",
    visibility: handsVisibility([c.address, c.top, c.impact]),
    value: ratio,
    thresholds: [t.goodMin, t.goodMax],
  };
  const detail = `Backswing ${back.toFixed(2)}s, downswing ${down.toFixed(2)}s: ${r} to 1. Tour players average about ${t.ideal} to 1.`;
  if (ratio >= t.goodMin && ratio <= t.goodMax) {
    return said("tempo-good", { ratio: r, back: spoken.sec(back), down: spoken.sec(down) }, rate(rating, strength(
      "tempo",
      `Smooth tempo: ${r} to 1`,
      detail,
      `Your backswing takes ${r} times as long as your downswing, right in the ${t.goodMin}–${t.goodMax} range where the body has time to load and then lead the arms down.`,
      moments.top,
    )));
  }
  const severity: Severity = ratio < t.okMin || ratio > t.okMax ? "major" : "minor";
  if (ratio < t.goodMin) {
    const extra = Math.max(0.05, t.goodMin * down - back);
    return said("tempo-rushed", { ratio: r, back: spoken.sec(back), down: spoken.sec(down), extra: spoken.sec(extra) }, rate(rating, withIssue("tempo-rushed", issue(
      "tempo",
      severity,
      t.goodMin / ratio,
      `Your backswing is rushed (${r} to 1)`,
      detail,
      `At ${back.toFixed(2)}s your backswing is only ${r} times your downswing. Taking about ${extra.toFixed(2)}s longer to reach the top would give your lower body time to start the downswing before your arms do.`,
      moments.top,
    ))));
  }
  return said("tempo-slow", { ratio: r, back: spoken.sec(back), down: spoken.sec(down) }, rate(rating, withIssue("tempo-slow", issue(
    "tempo",
    severity,
    ratio / t.goodMax,
    `Your downswing is slow for your backswing (${r} to 1)`,
    detail,
    `Your downswing takes ${down.toFixed(2)}s, long for a ${back.toFixed(2)}s backswing. A downswing that eases into the ball loses club speed and tends to leave the face open.`,
    moments.top,
  ))));
}

// ---------- Down the line ----------

function posture(c: Context): Finding | null {
  const { address, moments } = c;
  // The leg nearer the camera (the one MediaPipe is more confident about).
  const near = address[LM.leftKnee].visibility + address[LM.leftAnkle].visibility >= address[LM.rightKnee].visibility + address[LM.rightAnkle].visibility
    ? [LM.leftHip, LM.leftKnee, LM.leftAnkle]
    : [LM.rightHip, LM.rightKnee, LM.rightAnkle];
  if (!c.confident([address], [...TORSO, near[1], near[2]])) return null;
  const tilt = spineTilt(c, address);
  const flex = bend(c, address, near[0], near[1], near[2]);
  const T = DTL.spineTilt;
  const K = DTL.kneeFlex;
  const detail = `Spine tilted ${Math.round(tilt)}° forward (good: ${T.min}–${T.max}°), knees flexed ${Math.round(flex)}° (good: ${K.min}–${K.max}°).`;
  const problems = [
    { off: T.min - tilt, key: "posture-upright" as const, title: `Too upright at address (spine ${Math.round(tilt)}°)`, meaning: `At ${Math.round(tilt)}° your chest points out more than down at the ball, so your arms have to swing around you instead of up and down. That flattens the swing and tends to produce thin shots.` },
    { off: tilt - T.max, key: "posture-bent" as const, title: `Bent over too far at address (spine ${Math.round(tilt)}°)`, meaning: `Bending ${Math.round(tilt)}° from the hips leaves little room to turn, and it's hard to hold that angle through the ball, which is how fat shots happen.` },
    { off: K.min - flex, key: "posture-straight-knees" as const, title: `Knees nearly straight at address (${Math.round(flex)}°)`, meaning: `With only ${Math.round(flex)}° of knee flex your legs can't support a turn, so balance and contact suffer.` },
    { off: flex - K.max, key: "posture-squat" as const, title: `Squatting at address (${Math.round(flex)}° of knee flex)`, meaning: `${Math.round(flex)}° of knee flex sinks your hips, which blocks your hip turn and steepens the swing. Stand ${Math.round(flex - K.max)}° taller in the knees.` },
  ].filter((p) => p.off > 0);
  const rating: Rating = {
    phase: "setup",
    label: "your posture at address",
    metric: "posture",
    visibility: visibilityOf([address], [...TORSO, near[1], near[2]]),
    value: 0,
    thresholds: [],
  };
  if (problems.length === 0) {
    const room = Math.min(tilt - T.min, T.max - tilt, flex - K.min, K.max - flex);
    return said("posture-good", { tilt: spoken.deg(tilt), flex: spoken.deg(flex) }, rate({ ...rating, value: room, thresholds: [0] }, strength(
      "posture",
      "Athletic posture at address",
      detail,
      `${Math.round(tilt)}° of forward tilt with ${Math.round(flex)}° of knee flex puts your arms hanging under your shoulders, so you can turn without standing up.`,
      moments.address,
      "spine",
    )));
  }
  const worst = problems.sort((a, b) => b.off - a.off)[0];
  return said(worst.key, { tilt: spoken.deg(tilt), flex: spoken.deg(flex), over: spoken.deg(flex - K.max) }, rate({ ...rating, value: worst.off, thresholds: [0] }, withIssue("posture", issue("posture", worst.off > 8 ? "major" : "minor", 1 + worst.off / 8, worst.title, detail, worst.meaning, moments.address, "spine"))));
}

function takeaway(c: Context): Finding | null {
  const { track, moments, address, top, pxPerInch, ballSide } = c;
  if (!c.confident([address, top], [...HANDS, ...TORSO])) return null;
  // Checkpoint: the hands reach hip height in the backswing.
  const start = handsPosition(address, track);
  const hipY = hipsMid(c, address).y;
  const frame = c.between(moments.address, moments.top).find((f) => handsPosition(f.lms, track).y <= hipY);
  if (!frame) return null;
  const out = ((handsPosition(frame.lms, track).x - start.x) * ballSide) / pxPerInch; // + = toward the ball
  const way = out >= 0 ? "out toward the ball" : "in toward your body";
  const detail = `At hip height in the backswing your hands were ${inches(Math.abs(out))} ${way} from where they started.`;
  const rating: Rating = {
    phase: "takeaway",
    label: "your takeaway",
    metric: "takeaway",
    visibility: handsVisibility([address, top]),
    value: out,
    thresholds: [-DTL.takeawayInsideInches.minor, DTL.takeawayOutsideInches.minor],
  };
  const inside = grade(-out, DTL.takeawayInsideInches);
  const outside = grade(out, DTL.takeawayOutsideInches);
  if (inside) {
    return said("takeaway-inside", { in: spoken.inches(out) }, rate(rating, withIssue("takeaway-inside", issue(
      "takeaway",
      inside,
      -out / DTL.takeawayInsideInches.minor,
      `Takeaway whips ${inchesShort(-out)} inside`,
      detail,
      `Pulling the hands ${inches(-out)} behind you by hip height lays the club flat early. From there the arms usually have to lift and loop it back over the top on the way down.`,
      frame.time,
      "plane",
    ))));
  }
  if (outside) {
    return said("takeaway-outside", { in: spoken.inches(out) }, rate(rating, withIssue("takeaway-outside", issue(
      "takeaway",
      outside,
      out / DTL.takeawayOutsideInches.minor,
      `Takeaway pushes ${inchesShort(out)} outside`,
      detail,
      `Moving the hands ${inches(out)} out toward the ball sets the club steep right away, which makes an out-to-in downswing (pulls and slices) very likely.`,
      frame.time,
      "plane",
    ))));
  }
  return said("takeaway-good", { in: spoken.inches(out) }, rate(rating, strength(
    "takeaway",
    "Takeaway on a neutral path",
    detail,
    out < -3
      ? `Your hands work ${inches(-out)} inward by hip height, a normal amount as the body turns, without whipping the club behind you.`
      : "Your hands moved straight back with your turn, which sets the club on plane from the start.",
    frame.time,
    "plane",
  )));
}

function trailKnee(c: Context): Finding | null {
  const { address, top, moments, trail } = c;
  const points = [trail.hip, trail.knee, trail.ankle];
  if (!c.confident([address, top], points)) return null;
  const before = bend(c, address, trail.hip, trail.knee, trail.ankle);
  const after = bend(c, top, trail.hip, trail.knee, trail.ankle);
  const loss = before - after; // + = straightened
  const detail = `Trail knee flex: ${Math.round(before)}° at address, ${Math.round(after)}° at the top.`;
  const rating: Rating = {
    phase: "top",
    label: "your trail knee",
    metric: "trailKnee",
    visibility: visibilityOf([address, top], points),
    value: loss,
    thresholds: [DTL.trailKneeLossDegrees.minor],
  };
  const g = grade(loss, DTL.trailKneeLossDegrees);
  if (g) {
    return said("trail-knee", { before: spoken.deg(before), after: spoken.deg(after), loss: spoken.deg(loss) }, rate(rating, withIssue("trail-knee", issue(
      "trail-knee",
      g,
      loss / DTL.trailKneeLossDegrees.minor,
      `Trail leg straightens ${Math.round(loss)}° in the backswing`,
      detail,
      `Losing ${Math.round(loss)}° of flex in your trail knee lets your hips spin and rise instead of turning against a braced leg, which makes it hard to keep your posture coming down.`,
      moments.top,
      "spine",
    ))));
  }
  return said("trail-knee-good", { before: spoken.deg(before), after: spoken.deg(after), loss: spoken.deg(Math.max(loss, 0)) }, rate(rating, strength(
    "trail-knee",
    "Trail knee stayed flexed",
    detail,
    loss <= 0
      ? `Your trail knee kept all of its flex (${Math.round(before)}° at address, ${Math.round(after)}° at the top), giving your hips something to turn against.`
      : `Your trail knee lost only ${Math.round(loss)}° of flex, so your hips had something to turn against.`,
    moments.top,
    "spine",
  )));
}

function leadArmAtTop(c: Context): Finding | null {
  const { address, top, moments, lead } = c;
  // From down the line the lead arm is behind the body at the top; only judge
  // it when it's clearly visible and not pointing at the camera.
  if (!c.confident([top], [lead.shoulder, lead.elbow, lead.wrist], DTL.leadArmMinConfidence)) return null;
  const upper = (lms: Landmark[]) => distance(c.P(lms, lead.shoulder), c.P(lms, lead.elbow));
  const fore = (lms: Landmark[]) => distance(c.P(lms, lead.elbow), c.P(lms, lead.wrist));
  if (upper(top) < upper(address) * 0.6 || fore(top) < fore(address) * 0.6) return null;
  const angle = bend(c, top, lead.shoulder, lead.elbow, lead.wrist);
  const detail = `About ${Math.round(angle)}° of bend at the lead elbow at the top.`;
  const rating: Rating = {
    phase: "top",
    label: "your lead arm at the top",
    metric: "leadArm",
    visibility: visibilityOf([top], [lead.shoulder, lead.elbow, lead.wrist]),
    value: angle,
    thresholds: [DTL.leadArmBendDegrees.minor],
  };
  const g = grade(angle, DTL.leadArmBendDegrees);
  if (g) {
    return said("lead-arm", { angle: spoken.deg(angle) }, rate(rating, withIssue("lead-arm", issue(
      "lead-arm",
      g,
      angle / DTL.leadArmBendDegrees.minor,
      `Lead arm bends ${Math.round(angle)}° at the top`,
      detail,
      `A ${Math.round(angle)}° bend shortens your swing radius, and the arm has to straighten again by impact, a timing move that shows up as thin and fat shots.`,
      moments.top,
    ))));
  }
  return said("lead-arm-good", { angle: spoken.deg(angle) }, rate(rating, strength("lead-arm", "Wide lead arm at the top", detail, `Only ${Math.round(angle)}° of bend keeps your swing arc wide.`, moments.top)));
}

function plane(c: Context): Finding | null {
  const { track, moments, address, top, pxPerInch, ballSide } = c;
  if (!c.confident([address, top], [...HANDS, ...TORSO])) return null;
  // The first part of the downswing (later the hands move too fast to track).
  const end = moments.top + (moments.impact - moments.top) * 0.4;
  const frames = c.between(moments.top, end);
  if (frames.length < 2) return null;
  const start = handsPosition(top, track);
  let worst = { out: 0, inward: 0, time: frames[frames.length - 1].time };
  for (const f of frames) {
    const out = ((handsPosition(f.lms, track).x - start.x) * ballSide) / pxPerInch;
    if (out > worst.out) worst = { ...worst, out, time: f.time };
    if (-out > worst.inward) worst = { ...worst, inward: -out, time: f.time };
  }
  const drop = (handsPosition(frames[frames.length - 1].lms, track).y - start.y) / pxPerInch;
  const detail = `In the first part of the downswing your hands dropped ${inches(Math.max(drop, 0))} and moved ${inches(worst.out)} out toward the ball and ${inches(worst.inward)} in behind you.`;
  const rating: Rating = {
    phase: "transition",
    label: "your downswing path",
    metric: "plane",
    visibility: handsVisibility([top]),
    value: Math.max(worst.out, worst.inward),
    thresholds: [DTL.overTheTopInches.minor, DTL.underPlaneInches.minor],
  };
  const over = grade(worst.out, DTL.overTheTopInches);
  const under = grade(worst.inward, DTL.underPlaneInches);
  if (over) {
    return said("over-the-top", { in: spoken.inches(worst.out) }, rate({ ...rating, value: worst.out, thresholds: [DTL.overTheTopInches.minor] }, withIssue("over-the-top", issue(
      "plane",
      over,
      worst.out / DTL.overTheTopInches.minor,
      `Over the top: hands move ${inchesShort(worst.out)} out to start down`,
      detail,
      `Instead of dropping, your hands push ${inches(worst.out)} toward the ball as you start down, which puts the club above the plane and swings it across the ball from out to in: the classic pull or slice.`,
      worst.time,
      "plane",
    ))));
  }
  if (under) {
    return said("under-plane", { in: spoken.inches(worst.inward) }, rate({ ...rating, value: worst.inward, thresholds: [DTL.underPlaneInches.minor] }, withIssue("under-plane", issue(
      "plane",
      under,
      worst.inward / DTL.underPlaneInches.minor,
      `Stuck: hands drop ${inchesShort(worst.inward)} behind you`,
      detail,
      `Your hands fall ${inches(worst.inward)} in behind your body to start down, so the club comes from too far inside and the face is hard to square: pushes, hooks and heavy shots.`,
      worst.time,
      "plane",
    ))));
  }
  return said("plane-good", { drop: spoken.inches(Math.max(drop, 0)) }, rate(rating, strength(
    "plane",
    "Downswing started on plane",
    detail,
    `Your hands dropped ${inches(Math.max(drop, 0))} without drifting out or behind you, which keeps the club on the plane line coming down.`,
    worst.time,
    "plane",
  )));
}

/**
 * Early extension: the body moving toward the ball through impact. Two
 * signs, judged together: the spine standing up, and the hips moving toward
 * the ball. (They used to be two separate results with the same advice.)
 */
function earlyExtension(c: Context): Finding | null {
  const { address, impact, moments, pxPerInch, ballSide } = c;
  if (!c.confident([address, impact], TORSO)) return null;
  const before = spineTilt(c, address);
  const after = spineTilt(c, impact);
  const loss = before - after; // + = stood up
  const hips = ((hipsMid(c, impact).x - hipsMid(c, address).x) * ballSide) / pxPerInch; // + = toward the ball
  const spineGrade = grade(loss, DTL.spineAngleLossDegrees);
  const hipGrade = grade(hips, DTL.hipDepthLossInches);
  const detail = `Spine angle ${Math.round(before)}° at address, ${Math.round(after)}° at impact; hips ${inches(Math.abs(hips))} ${hips >= 0 ? "closer to" : "further from"} the ball.`;
  const vis = visibilityOf([address, impact], TORSO);
  const spineRating: Rating = { phase: "impact", label: "early extension", metric: "earlyExtension", visibility: vis, value: loss, thresholds: [DTL.spineAngleLossDegrees.minor] };
  const hipRating: Rating = { ...spineRating, metric: "hipDepth", value: hips, thresholds: [DTL.hipDepthLossInches.minor] };

  if (!spineGrade && !hipGrade) {
    // Both readings are fine; the one closer to its limit sets the confidence.
    const spineRoom = (DTL.spineAngleLossDegrees.minor - loss) / CFG.confidence.noise.earlyExtension;
    const hipRoom = (DTL.hipDepthLossInches.minor - hips) / CFG.confidence.noise.hipDepth;
    return said("early-ext-good", { before: spoken.deg(before), after: spoken.deg(after) }, rate(spineRoom < hipRoom ? spineRating : hipRating, strength(
      "early-extension",
      "Held your posture through impact",
      detail,
      `You kept ${Math.round(after)}° of your ${Math.round(before)}° address tilt and your hips stayed back, so your arms had room to swing through.`,
      moments.impact,
      "spine",
    )));
  }
  const severity: Severity = spineGrade === "major" || hipGrade === "major" ? "major" : "minor";
  const parts = [
    spineGrade ? `stood up ${Math.round(loss)}°` : null,
    hipGrade ? `pushed your hips ${inchesShort(hips)} toward the ball` : null,
  ].filter(Boolean);
  const meaning =
    (spineGrade && hipGrade
      ? `Your hips moved ${inches(hips)} toward the ball and your spine stood up ${Math.round(loss)}°: the two halves of early extension.`
      : spineGrade
        ? `Your spine stood up ${Math.round(loss)}° between address and impact.`
        : `Your hips moved ${inches(hips)} toward the ball by impact.`) +
    " That takes away the room your arms need, so the club either comes in steep or you have to flip your hands to find the ball: thin, toe and blocked shots.";
  // Rate with whichever sign is further past its limit.
  const useSpine = spineGrade && (!hipGrade || loss / DTL.spineAngleLossDegrees.minor >= hips / DTL.hipDepthLossInches.minor);
  return said(spineGrade && hipGrade ? "early-ext-both" : spineGrade ? "early-ext-spine" : "early-ext-hips", { deg: spoken.deg(loss), in: spoken.inches(hips), before: spoken.deg(before), after: spoken.deg(after) }, rate(useSpine ? spineRating : hipRating, withIssue("early-extension", issue(
    "early-extension",
    severity,
    Math.max(loss / DTL.spineAngleLossDegrees.minor, hips / DTL.hipDepthLossInches.minor),
    `Early extension: you ${parts.join(" and ")}`,
    detail,
    meaning,
    moments.impact,
    "spine",
  ))));
}

function headHeight(c: Context): Finding | null {
  const { track, moments, address, impact, pxPerInch } = c;
  const frames = c.between(moments.address, moments.impact);
  if (!c.confident([address, impact], HEAD) || frames.length === 0) return null;
  const startY = headCenter(address, track).y;
  let dip = { value: 0, time: moments.impact };
  for (const f of frames) {
    const down = (headCenter(f.lms, track).y - startY) / pxPerInch;
    if (down > dip.value) dip = { value: down, time: f.time };
  }
  const lift = (startY - headCenter(impact, track).y) / pxPerInch;
  const detail = `Your head dropped up to ${inches(dip.value)} during the swing and was ${inches(Math.abs(lift))} ${lift >= 0 ? "higher" : "lower"} at impact than at address.`;
  const worst = Math.max(dip.value, lift);
  const rating: Rating = {
    phase: "downswing",
    label: "your head height",
    metric: "headHeight",
    visibility: visibilityOf([address, impact], HEAD),
    value: worst,
    thresholds: [DTL.headDipLiftInches.minor],
  };
  const g = grade(worst, DTL.headDipLiftInches);
  if (g && dip.value >= lift) {
    return said("head-dip", { in: spoken.inches(dip.value) }, rate(rating, withIssue("head-height", issue(
      "head-height",
      g,
      dip.value / DTL.headDipLiftInches.minor,
      `Head drops ${inchesShort(dip.value)} during the swing`,
      detail,
      `Sinking ${inches(dip.value)} moves the bottom of your swing arc down by about the same amount, so the club meets the ground before the ball.`,
      dip.time,
      "head",
    ))));
  }
  if (g) {
    return said("head-rise", { in: spoken.inches(lift) }, rate(rating, withIssue("head-height", issue(
      "head-height",
      g,
      lift / DTL.headDipLiftInches.minor,
      `Head rises ${inchesShort(lift)} by impact`,
      detail,
      `Coming up ${inches(lift)} lifts the bottom of your arc, so the leading edge catches the ball's equator: thin and topped shots.`,
      moments.impact,
      "head",
    ))));
  }
  return said("head-height-good", { in: spoken.inches(Math.max(worst, 0)) }, rate(rating, strength(
    "head-height",
    `Head height within ${inchesShort(Math.max(worst, 1))}`,
    detail,
    "Your head stayed level enough that the bottom of your swing arc returned to where it started.",
    moments.impact,
    "head",
  )));
}

// ---------- Face on ----------

function hipSway(c: Context): Finding | null {
  const { track, moments, address, top, pxPerInch, targetSide, trail } = c;
  if (!c.confident([address, top], [LM.leftHip, LM.rightHip])) return null;
  const start = px(address, trail.hip, track).x;
  let worst = { sway: 0, time: moments.top };
  for (const f of c.between(moments.address, moments.top)) {
    const sway = ((start - px(f.lms, trail.hip, track).x) * targetSide) / pxPerInch;
    if (sway > worst.sway) worst = { sway, time: f.time };
  }
  const detail = `Your trail hip drifted up to ${inches(worst.sway)} away from the target in the backswing (about an inch of that is the hip turning, not sliding).`;
  const rating: Rating = {
    phase: "top",
    label: "hip sway",
    metric: "hipSway",
    visibility: visibilityOf([address, top], [LM.leftHip, LM.rightHip]),
    value: worst.sway,
    thresholds: [FO.hipSwayInches.minor],
  };
  const g = grade(worst.sway, FO.hipSwayInches);
  if (g) {
    return said("hip-sway", { in: spoken.inches(worst.sway) }, rate(rating, withIssue("hip-sway", issue(
      "hips",
      g,
      worst.sway / FO.hipSwayInches.minor,
      `Hips sway ${inchesShort(worst.sway)} away from the target`,
      detail,
      `Sliding ${inches(worst.sway - 1)} past the turn moves your swing center off the ball, and it has to slide all the way back to strike it on time: blocks if it doesn't, hooks if the hands flip to save it.`,
      worst.time,
      "hips",
    ))));
  }
  return said("hip-sway-good", { in: spoken.inches(worst.sway) }, rate(rating, strength(
    "hips",
    "Hips turned without a real sway",
    detail,
    "Your trail hip stayed inside the hip line while it turned, so your swing center stayed over the ball.",
    worst.time,
    "hips",
  )));
}

function shoulderTurn(c: Context): Finding | null {
  const { address, top, moments } = c;
  if (!c.confident([address, top], [LM.leftShoulder, LM.rightShoulder])) return null;
  const turn = turnAngle(c, address, top, LM.leftShoulder, LM.rightShoulder);
  if (turn === null) return null;
  const t = FO.shoulderTurnDegrees;
  const detail = `Estimated shoulder turn at the top: about ${Math.round(turn)}° (from the camera's depth estimate, the least precise reading).`;
  const rating: Rating = {
    phase: "top",
    label: "your shoulder turn",
    metric: "shoulderTurn",
    visibility: visibilityOf([address, top], [LM.leftShoulder, LM.rightShoulder]),
    value: turn,
    thresholds: [t.minor],
  };
  if (turn < t.minor) {
    return said("shoulder-turn-short", { deg: spoken.deg(turn), short: spoken.deg(t.minor - turn) }, rate(rating, withIssue("shoulder-turn", issue(
      "shoulder-turn",
      turn < t.major ? "major" : "minor",
      t.minor / Math.max(turn, 1),
      `Short shoulder turn (about ${Math.round(turn)}°)`,
      detail,
      `About ${Math.round(t.minor - turn)}° short of a full turn, so the arms have to supply the length of the swing, and arms-led swings tend to come over the top.`,
      moments.top,
    ))));
  }
  return said("shoulder-turn-good", { deg: spoken.deg(turn) }, rate(rating, strength(
    "shoulder-turn",
    `Full shoulder turn (about ${Math.round(turn)}°)`,
    detail,
    "Your back turned fully to the target, so the length of your swing came from your body rather than lifting the arms.",
    moments.top,
  )));
}

function reverseTilt(c: Context): Finding | null {
  const { top, moments, targetSide } = c;
  if (!c.confident([top], TORSO)) return null;
  const s = shouldersMid(c, top);
  const h = hipsMid(c, top);
  const lean = (Math.atan2((s.x - h.x) * targetSide, h.y - s.y) * 180) / Math.PI; // + = toward the target
  const detail = `At the top your upper body leaned ${Math.round(Math.abs(lean))}° ${lean >= 0 ? "toward" : "away from"} the target.`;
  const rating: Rating = {
    phase: "top",
    label: "reverse spine tilt",
    metric: "reverseTilt",
    visibility: visibilityOf([top], TORSO),
    value: lean,
    thresholds: [FO.reverseTiltDegrees.minor],
  };
  const g = grade(lean, FO.reverseTiltDegrees);
  if (g) {
    return said("reverse-tilt", { deg: spoken.deg(lean) }, rate(rating, withIssue("reverse-tilt", issue(
      "reverse-tilt",
      g,
      lean / FO.reverseTiltDegrees.minor,
      `Reverse spine tilt: leaning ${Math.round(lean)}° toward the target at the top`,
      detail,
      `Leaning ${Math.round(lean)}° toward the target at the top puts your weight on your lead side early, so in the downswing it falls back onto your trail side: fat, thin and weak shots.`,
      moments.top,
      "spine",
    ))));
  }
  return said("reverse-tilt-good", { deg: spoken.deg(lean) }, rate(rating, strength(
    "reverse-tilt",
    "Upper body stayed behind the ball at the top",
    detail,
    "With your chest over or behind your trail leg at the top, the downswing can shift toward the target instead of away from it.",
    moments.top,
    "spine",
  )));
}

/**
 * Sequencing (face on): after the top, the hips should start toward the
 * target before the arms start the club down. (The shoulders aren't used: from
 * the front, the middle of the shoulders keeps sliding toward the target while
 * they finish turning back, which looked like an early downswing start on
 * every test swing.)
 */
function sequencing(c: Context): Finding | null {
  const { track, moments, address, top, targetSide } = c;
  if (!c.confident([top, c.impact], [...TORSO, ...HANDS])) return null;
  const S = FS.sequencing;
  const from = moments.top - 0.25;
  const frames = c.between(from, moments.impact);
  if (frames.length < 6) return null;
  const ruler = torsoLength(address, track) || 1;
  // Each movement's position over time, in torso lengths.
  const hips = frames.map((f) => (hipsMid(c, f.lms).x * targetSide) / ruler);
  const handsDown = frames.map((f) => handsPosition(f.lms, track).y / ruler);
  const start = (v: number[], speed: number, after: number) => {
    for (let i = 1; i < frames.length - 1; i++) {
      if (frames[i].time < after) continue;
      const rate1 = (v[i + 1] - v[i - 1]) / (frames[i + 1].time - frames[i - 1].time);
      const rate2 = i + 2 < frames.length ? (v[i + 2] - v[i]) / (frames[i + 2].time - frames[i].time) : rate1;
      if (rate1 >= speed && rate2 >= speed) return frames[i].time;
    }
    return null;
  };
  const hipStart = start(hips, S.startSpeed, from);
  const handStart = start(handsDown, S.handsStartSpeed, moments.top - 0.1);
  if (hipStart === null || handStart === null) return null;
  const lead = hipStart - handStart; // + = the arms started before the hips
  const rel = (t: number) => `${t - moments.top >= 0 ? "+" : ""}${(t - moments.top).toFixed(2)}s`;
  const detail = `Start of the downswing, relative to the top: hips ${rel(hipStart)}, arms ${rel(handStart)}.`;
  const rating: Rating = {
    phase: "transition",
    label: "your downswing sequence",
    metric: "sequencing",
    visibility: visibilityOf([top, c.impact], [...TORSO, ...HANDS]),
    value: lead,
    thresholds: [S.minor],
  };
  const g = grade(lead, S);
  if (g) {
    return said("sequencing", { ms: spoken.ms(lead) }, rate(rating, withIssue("sequencing", issue(
      "sequencing",
      g,
      lead / S.minor,
      "Your arms start the downswing before your hips",
      detail,
      `Your arms started down ${Math.round(lead * 1000)} ms before your hips moved toward the target. When the arms fire first, the club gets thrown out over the plane and the lower body has nothing left to add.`,
      handStart,
      "hips",
    ))));
  }
  return said("sequencing-good", { ms: spoken.ms(handStart - hipStart) }, rate(rating, strength(
    "sequencing",
    "Hips start the downswing",
    detail,
    hipStart <= handStart
      ? `Your hips started toward the target ${Math.round((handStart - hipStart) * 1000)} ms before your arms came down, the order that lets the club drop into place and builds speed from the ground up.`
      : `Your hips and arms started together (within ${Math.round(lead * 1000)} ms), close to the ideal hips-first order.`,
    hipStart,
    "hips",
  )));
}

function weightShift(c: Context): Finding | null {
  const { address, impact, moments, pxPerInch, targetSide } = c;
  if (!c.confident([address, impact], [LM.leftHip, LM.rightHip])) return null;
  const shift = ((hipsMid(c, impact).x - hipsMid(c, address).x) * targetSide) / pxPerInch;
  const detail = `By impact your hips moved ${inches(Math.abs(shift))} ${shift >= 0 ? "toward" : "away from"} the target.`;
  const rating: Rating = {
    phase: "impact",
    label: "your weight shift",
    metric: "weightShift",
    visibility: visibilityOf([address, impact], [LM.leftHip, LM.rightHip]),
    value: shift,
    thresholds: [FO.weightShiftInches.minor],
  };
  if (shift < FO.weightShiftInches.major) {
    return said("weight-reverse", { in: spoken.inches(shift) }, rate(rating, withIssue("weight-shift", issue(
      "weight",
      "major",
      2 + Math.abs(shift),
      `Reverse weight shift: hips ${inchesShort(-shift)} away from the target`,
      detail,
      `Your hips went ${inches(-shift)} the wrong way by impact, so you're hitting from your trail side and the bottom of the swing comes before the ball.`,
      moments.impact,
      "hips",
    ))));
  }
  if (shift < FO.weightShiftInches.minor) {
    return said("weight-back", { in: spoken.inches(shift) }, rate(rating, withIssue("weight-shift", issue(
      "weight",
      "minor",
      FO.weightShiftInches.minor / Math.max(shift, 0.1),
      `Weight stays back: hips only ${inchesShort(shift)} forward`,
      detail,
      `Your hips moved just ${inches(shift)} toward the target, not enough to get the low point of the swing in front of the ball.`,
      moments.impact,
      "hips",
    ))));
  }
  return said("weight-good", { in: spoken.inches(shift) }, rate(rating, strength(
    "weight",
    `Good weight shift (${inchesShort(shift)} toward the target)`,
    detail,
    `Getting your hips ${inches(shift)} forward by impact puts the low point of your swing ahead of the ball.`,
    moments.impact,
    "hips",
  )));
}

function headLateral(c: Context): Finding | null {
  const { track, moments, address, impact, pxPerInch, targetSide } = c;
  if (!c.confident([address, impact], HEAD)) return null;
  const toward = ((headCenter(impact, track).x - headCenter(address, track).x) * targetSide) / pxPerInch;
  const detail = `By impact your head moved ${inches(Math.abs(toward))} ${toward >= 0 ? "toward" : "away from"} the target (1–2 inches of that is usually the head turning).`;
  const rating: Rating = {
    phase: "impact",
    label: "your head position",
    metric: "headLateral",
    visibility: visibilityOf([address, impact], HEAD),
    value: toward,
    thresholds: [FO.headSlideTowardTargetInches.minor, -FO.headDriftAwayInches.minor],
  };
  const slide = grade(toward, FO.headSlideTowardTargetInches);
  const drift = grade(-toward, FO.headDriftAwayInches);
  if (slide) {
    return said("head-slide", { in: spoken.inches(toward) }, rate(rating, withIssue("head-lateral", issue(
      "head",
      slide,
      toward / FO.headSlideTowardTargetInches.minor,
      `Head slides ${inchesShort(toward)} toward the target`,
      detail,
      `Your head got ${inches(toward)} ahead of where it started, which drags the swing's low point forward and closes off your release: low, weak pulls.`,
      moments.impact,
      "head",
    ))));
  }
  if (drift) {
    return said("head-hang", { in: spoken.inches(toward) }, rate(rating, withIssue("head-lateral", issue(
      "head",
      drift,
      -toward / FO.headDriftAwayInches.minor,
      `Head hangs back ${inchesShort(-toward)}`,
      detail,
      `Your head drifted ${inches(-toward)} away from the target, a sign your weight is falling back: the club bottoms out early, giving fat shots or a flip.`,
      moments.impact,
      "head",
    ))));
  }
  return said("head-centered", { in: spoken.inches(toward) }, rate(rating, strength(
    "head",
    "Head stayed centered through impact",
    detail,
    "Your head held its place while your hips moved forward, keeping you behind the ball at impact.",
    moments.impact,
    "head",
  )));
}

/** Face on: the lead arm should extend after impact, not fold ("chicken wing"). */
function leadArmRelease(c: Context): Finding | null {
  const { track, moments, address, lead } = c;
  const points = [lead.shoulder, lead.elbow, lead.wrist];
  const hipY = hipsMid(c, address).y;
  // The hands back up at hip height after impact.
  const frame = c.between(moments.impact + 0.02, moments.impact + 0.6).find((f) => handsPosition(f.lms, track).y <= hipY);
  if (!frame || !c.confident([frame.lms], points)) return null;
  const pose = poseAround(track, frame.time, 0.03) ?? frame.lms;
  const angle = bend(c, pose, lead.shoulder, lead.elbow, lead.wrist);
  const L = FO.chickenWingDegrees;
  const detail = `Lead elbow bend just after impact, with the hands at hip height: about ${Math.round(angle)}°.`;
  const rating: Rating = {
    phase: "finish",
    label: "your lead arm after impact",
    metric: "chickenWing",
    visibility: visibilityOf([pose], points),
    value: angle,
    thresholds: [L.minor],
  };
  const g = grade(angle, L);
  if (g) {
    return said("chicken-wing", { angle: spoken.deg(angle) }, rate(rating, withIssue("chicken-wing", issue(
      "release",
      g,
      angle / L.minor,
      `Lead arm folds after impact (${Math.round(angle)}°, "chicken wing")`,
      detail,
      `A lead elbow bent ${Math.round(angle)}° just after impact means the arm pulled in instead of extending, which holds the face open and costs distance: weak fades and thin shots.`,
      frame.time,
    ))));
  }
  return said("release-good", { angle: spoken.deg(angle) }, rate(rating, strength(
    "release",
    "Arms extended through the ball",
    detail,
    `Your lead arm was within ${Math.round(angle)}° of straight after impact, so the club released fully down the target line.`,
    frame.time,
  )));
}

// ---------- Finish (both angles) ----------

function finishBalance(c: Context): Finding | null {
  const { track, phases, angle, lead, trail } = c;
  const F = FS.finish;
  const finish = phases.finish;
  const last = track.frames.filter((f) => f.landmarks).at(-1)?.time ?? 0;
  if (finish === null || last - finish < F.minSeconds) return null;
  const pose = poseAround(track, finish, CFG.keyPoseWindow.finish);
  if (!pose || !c.confident([pose], [...TORSO, ...HEAD])) return null;
  const ruler = torsoLength(pose, track) || 1;
  const window = c.between(finish, Math.min(finish + F.holdSeconds, last));
  // Hold: how far the head and hips drifted sideways after reaching the
  // finish. The average over the start of the window is compared with the
  // average over its end, so a jittery frame (e.g. a backlit golfer) can't
  // look like a stumble.
  const held = Math.min(F.holdSeconds, last - finish);
  const average = (from: number, to: number, at: (lms: Landmark[]) => number) => {
    const values = window.filter((f) => f.time >= from - 1e-6 && f.time <= to + 1e-6).map((f) => at(f.lms));
    return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
  };
  const drift = (at: (lms: Landmark[]) => number) =>
    Math.abs(average(finish + held - F.edgeSeconds, finish + held, at) - average(finish, finish + F.edgeSeconds, at)) / ruler;
  const moved = Math.max(drift((lms) => headCenter(lms, track).x), drift((lms) => hipsMid(c, lms).x));
  const movedIn = (moved * ruler) / c.pxPerInch;
  const vis = visibilityOf([pose], [...TORSO, ...HEAD]);
  const holdRating: Rating = { phase: "finish", label: "your finish balance", metric: "finish", visibility: vis, value: moved, thresholds: [F.holdTorso.minor] };

  // Face on: how far the hips got over the lead foot (0 = trail foot, 1 = lead foot).
  let forward: number | null = null;
  if (angle === "face-on" && c.confident([pose], [lead.ankle, trail.ankle])) {
    const leadX = c.P(pose, lead.ankle).x;
    const trailX = c.P(pose, trail.ankle).x;
    if (Math.abs(leadX - trailX) > ruler * 0.2) forward = (hipsMid(c, pose).x - trailX) / (leadX - trailX);
  }
  const weightBack = forward === null ? null : grade(1 - forward, { minor: 1 - F.weightForward.minor, major: 1 - F.weightForward.major });
  const wobble = grade(moved, F.holdTorso);
  const detail =
    `In the ${held.toFixed(1)}s after reaching your finish your head and hips moved ${inches(movedIn)} sideways.` +
    (forward !== null ? ` Your hips finished ${Math.round(Math.min(Math.max(forward, 0), 1.2) * 100)}% of the way from your trail foot to your lead foot.` : "");
  if (weightBack && (!wobble || (1 - (forward ?? 1)) / (1 - F.weightForward.minor) >= moved / F.holdTorso.minor)) {
    return said("finish-back-foot", { pct: spoken.pct(forward!) }, rate({ ...holdRating, value: forward!, thresholds: [F.weightForward.minor] }, withIssue("finish-balance", issue(
      "finish",
      weightBack,
      (1 - forward!) / (1 - F.weightForward.minor),
      `Finish on your back foot (hips ${Math.round(forward! * 100)}% of the way forward)`,
      detail,
      `Your hips ended only ${Math.round(forward! * 100)}% of the way to your lead foot, so your weight never fully got through the shot. A balanced finish has your belt buckle facing the target over your lead foot.`,
      finish,
      "hips",
    ))));
  }
  if (wobble) {
    return said("finish-wobble", { in: spoken.inches(movedIn) }, rate(holdRating, withIssue("finish-balance", issue(
      "finish",
      wobble,
      moved / F.holdTorso.minor,
      `Couldn't hold the finish (moved ${inchesShort(movedIn)})`,
      detail,
      `Moving ${inches(movedIn)} sideways right after reaching the finish means you were off balance, usually because the swing pulled you toward the ball or onto your heels before impact.`,
      finish,
      angle === "face-on" ? "hips" : "head",
    ))));
  }
  return said("finish-good", { in: spoken.inches(movedIn), pct: forward !== null ? spoken.pct(forward) : "" }, rate(holdRating, strength(
    "finish",
    "Balanced, held finish",
    detail,
    forward !== null
      ? `You held still over your lead foot (${Math.round(forward * 100)}% of the way forward), proof the swing stayed in balance from start to finish.`
      : `You held the finish with under ${inchesShort(Math.max(movedIn, 1))} of movement, proof the swing stayed in balance.`,
    finish,
    angle === "face-on" ? "hips" : "head",
  )));
}

/**
 * How far a body line (shoulders or hips) turned between two poses, in degrees,
 * seen from above. Uses MediaPipe's depth estimate: from the front, a 2D
 * picture can't show a turn properly (forward bend keeps the shoulders looking
 * wide). Returns null when depth is missing or the turn can't be read.
 */
function turnAngle(c: Context, from: Landmark[], to: Landmark[], a: number, b: number): number | null {
  const z = (lms: Landmark[], i: number) => lms[i].z;
  if ([z(from, a), z(from, b), z(to, a), z(to, b)].some((v) => v === undefined)) return null;
  const line = (lms: Landmark[]) => ({
    x: (lms[a].x - lms[b].x) * c.track.width,
    z: (lms[a].z! - lms[b].z!) * c.track.width,
  });
  const p = line(from);
  const q = line(to);
  const lengths = Math.hypot(p.x, p.z) * Math.hypot(q.x, q.z);
  if (lengths === 0) return null;
  const cos = Math.max(-1, Math.min(1, (p.x * q.x + p.z * q.z) / lengths));
  return (Math.acos(cos) * 180) / Math.PI;
}
