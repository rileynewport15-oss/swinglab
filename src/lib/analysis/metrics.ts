import { ANALYSIS_CONFIG } from "@/config/analysisConfig";
import { angleDegrees, tiltFromVertical } from "../shapes";
import { poseAt } from "../pose/skeleton";
import {
  LM,
  distance,
  handsPosition,
  headCenter,
  mid,
  px,
  torsoLength,
  type Landmark,
  type PoseTrack,
  type Px,
} from "../pose/landmarks";
import type { CameraAngle } from "../pose/autoAids";
import { CLUB_LEAD, takeawayTime, type KeyMoments } from "./keyMoments";
import { grade, inches, issue, strength, withIssue, type Finding, type Severity } from "./findings";

type Input = {
  track: PoseTrack;
  moments: KeyMoments;
  angle: CameraAngle;
};

const CFG = ANALYSIS_CONFIG;
const DTL = CFG.fullSwing.downTheLine;
const FO = CFG.fullSwing.faceOn;

/**
 * Turn the pose data of a full swing into golfer-friendly findings (putts
 * have their own checks, see src/lib/putting). Only checks that make
 * sense for the camera angle, and where the body points are
 * detected confidently, are included. Biggest issues come first.
 */
export function analyzeSwing(input: Input): Finding[] {
  const ctx = makeContext(input);
  if (!ctx) return [];

  const checks: ((c: Context) => Finding | null)[] =
    input.angle === "down-the-line"
      ? [tempo, posture, takeaway, leadArm, handPath, earlyExtension, hipDepth, headDipLift]
      : [tempo, hipSway, shoulderTurn, reverseTilt, weightShift, headLateral];

  const findings = checks.map((check) => check(ctx)).filter((f): f is Finding => f !== null);
  const rank = (f: Finding) => (f.status === "strength" ? 2 : f.severity === "major" ? 0 : 1);
  return findings.sort((a, b) => rank(a) - rank(b) || b.score - a.score);
}

// ---------- Shared setup ----------

type Context = Input & {
  address: Landmark[];
  top: Landmark[];
  impact: Landmark[];
  pxPerInch: number;
  targetSide: number; // +1 if the target is to the right on screen (face on)
  ballSide: number; // +1 if the ball is to the right of the golfer (down the line)
  lead: { shoulder: number; elbow: number; wrist: number; index: number }; // lead-side landmarks
  P: (lms: Landmark[], i: number) => Px;
  between: (from: number, to: number) => { time: number; lms: Landmark[] }[];
  confident: (poses: Landmark[][], points: number[], min?: number) => boolean;
};

function makeContext(input: Input): Context | null {
  const { track, moments, angle } = input;
  const address = poseAt(track, moments.address);
  const top = poseAt(track, moments.top);
  const impact = poseAt(track, moments.impact);
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
  const lead = rightHanded
    ? { shoulder: LM.leftShoulder, elbow: LM.leftElbow, wrist: LM.leftWrist, index: LM.leftIndex }
    : { shoulder: LM.rightShoulder, elbow: LM.rightElbow, wrist: LM.rightWrist, index: LM.rightIndex };

  return {
    ...input,
    address,
    top,
    impact,
    // Pixels per inch, using the golfer's own torso as a ruler.
    pxPerInch: torsoLength(address, track) / CFG.torsoInches,
    targetSide,
    ballSide,
    lead,
    P,
    between: (from, to) =>
      track.frames
        .filter((f) => f.landmarks && f.time >= from - 1e-6 && f.time <= to + 1e-6)
        .map((f) => ({ time: f.time, lms: f.landmarks! })),
    confident: (poses, points, min = CFG.minConfidence) => {
      const values = poses.flatMap((lms) => points.map((i) => lms[i].visibility));
      return values.reduce((s, v) => s + v, 0) / values.length >= min;
    },
  };
}

const hipsMid = (c: Context, lms: Landmark[]) => mid(c.P(lms, LM.leftHip), c.P(lms, LM.rightHip));
const shouldersMid = (c: Context, lms: Landmark[]) => mid(c.P(lms, LM.leftShoulder), c.P(lms, LM.rightShoulder));
const spineTilt = (c: Context, lms: Landmark[]) => tiltFromVertical(hipsMid(c, lms), shouldersMid(c, lms));
const TORSO = [LM.leftShoulder, LM.rightShoulder, LM.leftHip, LM.rightHip];
const HEAD = [LM.nose, LM.leftEar, LM.rightEar];
const HANDS = [LM.leftWrist, LM.rightWrist, LM.leftIndex, LM.rightIndex];

// ---------- Tempo ----------

function tempo(c: Context): Finding | null {
  const { track, moments } = c;
  // The backswing starts when the club starts moving: a moment before the
  // hands do (but never before the address marker).
  const takeaway = takeawayTime(track, moments) - CLUB_LEAD;
  const back = moments.top - Math.max(takeaway, moments.address);
  const down = moments.impact - moments.top;
  if (back <= 0 || down <= 0) return null;

  const ratio = back / down;
  const t = CFG.fullSwing.tempo;
  const detail = `Backswing ${back.toFixed(2)}s, downswing ${down.toFixed(2)}s. Ideal is about ${t.ideal} to 1.`;
  const r = ratio.toFixed(1);

  if (ratio >= t.goodMin && ratio <= t.goodMax) {
    return strength(
      "tempo",
      `Smooth tempo: ${r} to 1`,
      detail,
      "Good rhythm lets your body and arms work in sequence, for solid contact and more consistent distance.",
      moments.top,
    );
  }
  const severity: Severity = ratio < t.okMin || ratio > t.okMax ? "major" : "minor";
  const score = ratio < t.goodMin ? t.goodMin / ratio : ratio / t.goodMax;
  if (ratio < t.goodMin) {
    return withIssue("tempo-rushed", issue(
      "tempo",
      severity,
      score,
      `Your backswing is rushed (${r} to 1)`,
      detail,
      "A rushed backswing lets your arms outrace your body. That often leads to an over-the-top move (pulls and slices) and inconsistent contact. Take it back a little slower.",
      moments.top,
    ));
  }
  return withIssue("tempo-slow", issue(
    "tempo",
    severity,
    score,
    `Your downswing is slow compared to your backswing (${r} to 1)`,
    detail,
    "A slow, guided downswing costs clubhead speed and often leaves the face open: pushes, slices and lost distance. Let the club speed up through the ball.",
    moments.top,
  ));
}

// ---------- Full swing, down the line ----------

function posture(c: Context): Finding | null {
  const { address, moments } = c;
  // Use the leg nearer the camera (the one MediaPipe is more confident about).
  const leftVis = address[LM.leftKnee].visibility + address[LM.leftAnkle].visibility;
  const rightVis = address[LM.rightKnee].visibility + address[LM.rightAnkle].visibility;
  const [hip, knee, ankle] =
    leftVis >= rightVis ? [LM.leftHip, LM.leftKnee, LM.leftAnkle] : [LM.rightHip, LM.rightKnee, LM.rightAnkle];
  if (!c.confident([address], [...TORSO, knee, ankle])) return null;

  const tilt = spineTilt(c, address);
  const flex = 180 - angleDegrees(c.P(address, hip), c.P(address, knee), c.P(address, ankle));
  const detail = `At address: spine tilted ${Math.round(tilt)}° forward (normal ${DTL.spineTilt.min}–${DTL.spineTilt.max}°), knees flexed ${Math.round(flex)}° (normal ${DTL.kneeFlex.min}–${DTL.kneeFlex.max}°).`;

  // How far outside the normal range each one is, in degrees.
  const problems = [
    {
      off: DTL.spineTilt.min - tilt,
      title: `You're standing too upright at address (spine ${Math.round(tilt)}°)`,
      meaning: "Standing too tall makes it hard to turn on plane and often leads to a flat, around-the-body swing and thin shots.",
    },
    {
      off: tilt - DTL.spineTilt.max,
      title: `You're bent over too much at address (spine ${Math.round(tilt)}°)`,
      meaning: "Bending over too far restricts your turn and makes it easy to lose posture, which often leads to fat shots.",
    },
    {
      off: DTL.kneeFlex.min - flex,
      title: `Your knees are nearly straight at address (${Math.round(flex)}° of flex)`,
      meaning: "Locked knees make you stiff and hurt your balance, so contact is less consistent.",
    },
    {
      off: flex - DTL.kneeFlex.max,
      title: `You're squatting too much at address (${Math.round(flex)}° of knee flex)`,
      meaning: "Too much knee bend limits your hip turn and often leads to a steep swing and fat shots.",
    },
  ].filter((p) => p.off > 0);

  if (problems.length === 0) {
    return strength(
      "posture",
      "Athletic posture at address",
      detail,
      "A good setup lets you turn freely and swing on plane, which makes solid contact much easier.",
      moments.address,
      "spine",
    );
  }
  const worst = problems.sort((a, b) => b.off - a.off)[0];
  return withIssue("posture", issue("posture", worst.off > 8 ? "major" : "minor", 1 + worst.off / 8, worst.title, detail, worst.meaning, moments.address, "spine"));
}

function takeaway(c: Context): Finding | null {
  const { track, moments, address, top, pxPerInch, ballSide } = c;
  if (!c.confident([address, top], [...HANDS, ...TORSO])) return null;
  // Checkpoint: the hands reach hip height in the backswing.
  const start = handsPosition(address, track);
  const hipY = hipsMid(c, address).y;
  const frame = c.between(moments.address, moments.top).find((f) => handsPosition(f.lms, track).y <= hipY);
  if (!frame) return null;
  // How far the hands moved in or out since address (+ = out toward the ball).
  const out = ((handsPosition(frame.lms, track).x - start.x) * ballSide) / pxPerInch;
  const detail = `When your hands reached hip height they had moved ${inches(Math.abs(out))} ${out >= 0 ? "out toward the ball" : "in toward your body"}.`;

  const inside = grade(-out, DTL.takeawayInsideInches);
  const outside = grade(out, DTL.takeawayOutsideInches);
  if (inside) {
    return withIssue("takeaway-inside", issue(
      "takeaway",
      inside,
      -out / DTL.takeawayInsideInches.minor,
      "Your takeaway goes too far inside",
      detail,
      "Whipping the hands in behind you gets the club too flat early. That often leads to a loop over the top or getting stuck: pushes and hooks.",
      frame.time,
      "plane",
    ));
  }
  if (outside) {
    return withIssue("takeaway-outside", issue(
      "takeaway",
      outside,
      out / DTL.takeawayOutsideInches.minor,
      "Your takeaway goes too far outside",
      detail,
      "Pushing the hands out toward the ball sets the club steep and outside, which often leads to an over-the-top downswing: pulls and slices.",
      frame.time,
      "plane",
    ));
  }
  return strength(
    "takeaway",
    "Your takeaway stayed on a neutral path",
    detail,
    "Starting the club back on a neutral path makes it much easier to swing on plane all the way.",
    frame.time,
    "plane",
  );
}

function leadArm(c: Context): Finding | null {
  const { address, top, moments, lead } = c;
  if (!c.confident([top], [lead.shoulder, lead.elbow, lead.wrist], DTL.leadArmMinConfidence)) return null;
  // From down the line the arm can point at the camera; skip if it looks foreshortened.
  const upper = (lms: Landmark[]) => distance(c.P(lms, lead.shoulder), c.P(lms, lead.elbow));
  const fore = (lms: Landmark[]) => distance(c.P(lms, lead.elbow), c.P(lms, lead.wrist));
  if (upper(top) < upper(address) * 0.6 || fore(top) < fore(address) * 0.6) return null;

  const bend = 180 - angleDegrees(c.P(top, lead.shoulder), c.P(top, lead.elbow), c.P(top, lead.wrist));
  const detail = `About ${Math.round(bend)}° of bend at the lead elbow at the top.`;
  const g = grade(bend, DTL.leadArmBendDegrees);
  if (g) {
    return withIssue("lead-arm", issue(
      "lead-arm",
      g,
      bend / DTL.leadArmBendDegrees.minor,
      "Your lead arm bends a lot at the top",
      detail,
      "A bent lead arm shrinks the width of your swing, so you lose power and it's harder to return the club to the ball the same way each time. It often leads to thin and fat shots.",
      moments.top,
    ));
  }
  return strength(
    "lead-arm",
    "Your lead arm stayed fairly straight at the top",
    detail,
    "A wide, extended lead arm keeps your swing arc big for more distance and consistent contact.",
    moments.top,
  );
}

function handPath(c: Context): Finding | null {
  const { track, moments, address, top, pxPerInch, ballSide } = c;
  if (!c.confident([address, top], [...HANDS, ...TORSO])) return null;
  // Over the top starts in the transition: instead of dropping, the hands push
  // out toward the ball. We only look at the first 40% of the downswing,
  // because later the hands move too fast for pose detection to track them.
  const end = moments.top + (moments.impact - moments.top) * 0.4;
  const frames = c.between(moments.top, end);
  if (frames.length < 2) return null;
  const start = handsPosition(top, track);
  let worst = { out: 0, inward: 0, time: frames[frames.length - 1].time };
  for (const f of frames) {
    const out = ((handsPosition(f.lms, track).x - start.x) * ballSide) / pxPerInch; // + = toward the ball
    if (out > worst.out) worst = { ...worst, out, time: f.time };
    if (-out > worst.inward) worst = { ...worst, inward: -out, time: f.time };
  }
  const last = handsPosition(frames[frames.length - 1].lms, track);
  const drop = (last.y - start.y) / pxPerInch;
  const detail = `At the start of the downswing your hands dropped ${inches(Math.max(drop, 0))}, moving up to ${inches(worst.out)} out toward the ball and ${inches(worst.inward)} in behind you.`;

  const over = grade(worst.out, DTL.overTheTopInches);
  const under = grade(worst.inward, DTL.underPlaneInches);
  if (over) {
    return withIssue("over-the-top", issue(
      "plane",
      over,
      worst.out / DTL.overTheTopInches.minor,
      "Over the top: your hands push out toward the ball to start down",
      detail,
      "Starting down with the hands moving out puts the club above the plane, so it cuts across the ball from out to in. This often leads to pulls and slices.",
      worst.time,
      "plane",
    ));
  }
  if (under) {
    return withIssue("under-plane", issue(
      "plane",
      under,
      worst.inward / DTL.underPlaneInches.minor,
      "Stuck: your hands drop in behind you to start down",
      detail,
      "The club gets too far under the plane and comes from too far inside, so the face is hard to square. This often leads to pushes, hooks and fat shots.",
      worst.time,
      "plane",
    ));
  }
  return strength(
    "plane",
    "Your downswing started on plane",
    detail,
    "Dropping the hands down (not out) to start the downswing keeps the club on plane, for a square, solid strike and straighter shots.",
    worst.time,
    "plane",
  );
}

function earlyExtension(c: Context): Finding | null {
  const { address, impact, moments } = c;
  if (!c.confident([address, impact], TORSO)) return null;
  const before = spineTilt(c, address);
  const after = spineTilt(c, impact);
  const loss = before - after; // positive = stood up
  const detail = `Spine angle: ${Math.round(before)}° at address, ${Math.round(after)}° at impact.`;

  const g = grade(loss, DTL.spineAngleLossDegrees);
  if (g) {
    return withIssue("early-extension", issue(
      "spine",
      g,
      loss / DTL.spineAngleLossDegrees.minor,
      `You stood up ${Math.round(loss)}° by impact (early extension)`,
      detail,
      "Standing up through impact pulls the club away from the ball. It often causes thin and toe hits, blocks to the right, and quick hooks when you flip your hands to save it.",
      moments.impact,
      "spine",
    ));
  }
  return strength(
    "spine",
    "You held your posture through impact",
    detail,
    "Keeping your spine angle lets the club return to the same spot it started, for centered contact.",
    moments.impact,
    "spine",
  );
}

function hipDepth(c: Context): Finding | null {
  const { address, impact, moments, pxPerInch, ballSide } = c;
  if (!c.confident([address, impact], [LM.leftHip, LM.rightHip])) return null;
  const toward = ((hipsMid(c, impact).x - hipsMid(c, address).x) * ballSide) / pxPerInch;
  const detail = `By impact your hips moved ${inches(Math.abs(toward))} ${toward >= 0 ? "toward" : "away from"} the ball.`;
  const g = grade(toward, DTL.hipDepthLossInches);
  if (g) {
    return withIssue("early-extension", issue(
      "hip-depth",
      g,
      toward / DTL.hipDepthLossInches.minor,
      `Your hips moved ${inches(toward)} toward the ball by impact`,
      detail,
      "When your hips push toward the ball, your arms run out of room. This often leads to blocks, hooks, shanks and thin shots.",
      moments.impact,
      "spine",
    ));
  }
  return strength(
    "hip-depth",
    "Your hips kept their depth through impact",
    detail,
    "Keeping your hips back gives your arms room to swing through, for centered contact.",
    moments.impact,
    "spine",
  );
}

function headDipLift(c: Context): Finding | null {
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

  if (dip.value >= lift) {
    const g = grade(dip.value, DTL.headDipLiftInches);
    if (g) {
      return withIssue("head-height", issue(
        "head-height",
        g,
        dip.value / DTL.headDipLiftInches.minor,
        `Your head dropped ${inches(dip.value)} during the swing`,
        detail,
        "Dropping your head lowers the bottom of your swing, which often leads to fat shots.",
        dip.time,
        "head",
      ));
    }
  } else {
    const g = grade(lift, DTL.headDipLiftInches);
    if (g) {
      return withIssue("head-height", issue(
        "head-height",
        g,
        lift / DTL.headDipLiftInches.minor,
        `Your head lifted ${inches(lift)} by impact`,
        detail,
        "Lifting your head raises the low point of your swing, which often leads to thin and topped shots.",
        moments.impact,
        "head",
      ));
    }
  }
  return strength(
    "head-height",
    "Your head height stayed steady",
    detail,
    "A steady head keeps the bottom of your swing in the same place, for consistent contact.",
    moments.impact,
    "head",
  );
}

// ---------- Full swing, face on ----------

function hipSway(c: Context): Finding | null {
  const { track, moments, address, top, pxPerInch, targetSide } = c;
  if (!c.confident([address, top], [LM.leftHip, LM.rightHip])) return null;
  // The trail hip is the one further from the target.
  const left = px(address, LM.leftHip, track);
  const right = px(address, LM.rightHip, track);
  const trail = left.x * targetSide < right.x * targetSide ? LM.leftHip : LM.rightHip;
  const start = px(address, trail, track).x;
  let worst = { sway: 0, time: moments.top };
  for (const f of c.between(moments.address, moments.top)) {
    const sway = ((start - px(f.lms, trail, track).x) * targetSide) / pxPerInch;
    if (sway > worst.sway) worst = { sway, time: f.time };
  }
  const detail = `Your trail hip moved up to ${inches(worst.sway)} away from the target on the backswing.`;
  const g = grade(worst.sway, FO.hipSwayInches);
  if (g) {
    return withIssue("hip-sway", issue(
      "hips",
      g,
      worst.sway / FO.hipSwayInches.minor,
      `Your hips swayed ${inches(worst.sway)} away from the target`,
      detail,
      "Sliding your hips instead of turning them makes it hard to get back to the ball on time. It often causes fat and thin shots, blocks and hooks. Keep your trail hip inside the orange line.",
      worst.time,
      "hips",
    ));
  }
  return strength(
    "hips",
    "Your hips turned without swaying",
    detail,
    "Turning around a stable center makes it much easier to return to the ball for solid contact.",
    worst.time,
    "hips",
  );
}

function headLateral(c: Context): Finding | null {
  const { track, moments, address, impact, pxPerInch, targetSide } = c;
  if (!c.confident([address, impact], HEAD)) return null;
  const toward = ((headCenter(impact, track).x - headCenter(address, track).x) * targetSide) / pxPerInch;
  const detail = `By impact your head moved ${inches(Math.abs(toward))} ${toward >= 0 ? "toward" : "away from"} the target.`;
  const slide = grade(toward, FO.headSlideTowardTargetInches);
  const drift = grade(-toward, FO.headDriftAwayInches);
  if (slide) {
    return withIssue("head-lateral", issue(
      "head",
      slide,
      toward / FO.headSlideTowardTargetInches.minor,
      `Your head slid ${inches(toward)} toward the target`,
      detail,
      "Your upper body is sliding ahead of the ball. This often leads to pulls, slices, and low, weak shots. Keep your head behind the ball through impact.",
      moments.impact,
      "head",
    ));
  }
  if (drift) {
    return withIssue("head-lateral", issue(
      "head",
      drift,
      -toward / FO.headDriftAwayInches.minor,
      `Your head drifted ${inches(-toward)} away from the target`,
      detail,
      "You're hanging back on your trail side, which often causes fat shots, thin shots and hooks.",
      moments.impact,
      "head",
    ));
  }
  return strength(
    "head",
    "Your head stayed steady and behind the ball",
    detail,
    "A steady head behind the ball helps you hit down on it with a square face.",
    moments.impact,
    "head",
  );
}

function weightShift(c: Context): Finding | null {
  const { address, impact, moments, pxPerInch, targetSide } = c;
  if (!c.confident([address, impact], [LM.leftHip, LM.rightHip])) return null;
  const shift = ((hipsMid(c, impact).x - hipsMid(c, address).x) * targetSide) / pxPerInch;
  const detail = `By impact your hips moved ${inches(Math.abs(shift))} ${shift >= 0 ? "toward" : "away from"} the target.`;
  const meaning =
    "Getting your weight onto your lead side lets you hit down on the ball. Staying back often causes fat and thin shots, high weak shots, and flipping at impact.";
  if (shift < FO.weightShiftInches.major) {
    return withIssue("weight-shift", issue("weight", "major", 2 + Math.abs(shift), "Reverse weight shift: your hips moved away from the target", detail, meaning, moments.impact, "hips"));
  }
  if (shift < FO.weightShiftInches.minor) {
    return withIssue("weight-shift", issue("weight", "minor", FO.weightShiftInches.minor / Math.max(shift, 0.1), "Your weight stayed back at impact", detail, meaning, moments.impact, "hips"));
  }
  return strength(
    "weight",
    `Good weight shift: hips moved ${inches(shift)} toward the target`,
    detail,
    "Shifting onto your lead side lets you compress the ball for solid, penetrating shots.",
    moments.impact,
    "hips",
  );
}

function reverseTilt(c: Context): Finding | null {
  const { top, moments, targetSide } = c;
  if (!c.confident([top], TORSO)) return null;
  const s = shouldersMid(c, top);
  const h = hipsMid(c, top);
  // Positive = upper body leaning toward the target.
  const lean = (Math.atan2((s.x - h.x) * targetSide, h.y - s.y) * 180) / Math.PI;
  const detail = `At the top your upper body leaned ${Math.round(Math.abs(lean))}° ${lean >= 0 ? "toward" : "away from"} the target.`;
  const g = grade(lean, FO.reverseTiltDegrees);
  if (g) {
    return withIssue("reverse-tilt", issue(
      "reverse-tilt",
      g,
      lean / FO.reverseTiltDegrees.minor,
      `Reverse spine tilt at the top (${Math.round(lean)}° toward the target)`,
      detail,
      "Leaning toward the target at the top (a reverse pivot) leaves your weight on the wrong side. It often leads to fat and thin shots, pulls, slices and lost power.",
      moments.top,
      "spine",
    ));
  }
  return strength(
    "reverse-tilt",
    "Your upper body stayed behind the ball at the top",
    detail,
    "Staying behind the ball at the top sets you up to shift into your lead side and strike down on the ball.",
    moments.top,
    "spine",
  );
}

function shoulderTurn(c: Context): Finding | null {
  const { address, top, moments } = c;
  if (!c.confident([address, top], [LM.leftShoulder, LM.rightShoulder])) return null;
  const turn = turnAngle(c, address, top, LM.leftShoulder, LM.rightShoulder);
  if (turn === null) return null;
  const detail = `Estimated shoulder turn at the top: about ${Math.round(turn)}°.`;
  const t = FO.shoulderTurnDegrees;
  if (turn < t.minor) {
    return withIssue("shoulder-turn", issue(
      "shoulder-turn",
      turn < t.major ? "major" : "minor",
      t.minor / Math.max(turn, 1),
      `Short shoulder turn (about ${Math.round(turn)}°)`,
      detail,
      "A short turn makes your arms do the work. It often costs distance and leads to an over-the-top move: pulls and slices.",
      moments.top,
    ));
  }
  return strength(
    "shoulder-turn",
    `Full shoulder turn (about ${Math.round(turn)}°)`,
    detail,
    "A full turn stores power and gives your arms time to swing down on plane.",
    moments.top,
  );
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
  // Line from one side to the other, seen from above: (sideways, depth).
  // Depth uses the same scale as sideways (fractions of the video width).
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
