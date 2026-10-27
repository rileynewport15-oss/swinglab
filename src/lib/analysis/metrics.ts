import { ANALYSIS_CONFIG, type ShotMode } from "@/config/analysisConfig";
import { tiltFromVertical, type AidKind } from "../shapes";
import { poseAt } from "../pose/skeleton";
import { LM, handsPosition, headCenter, mid, px, torsoLength, type Landmark, type PoseTrack } from "../pose/landmarks";
import type { CameraAngle } from "../pose/autoAids";
import { CLUB_LEAD, takeawayTime, type KeyMoments } from "./keyMoments";

export type Finding = {
  id: string;
  status: "strength" | "improve";
  title: string; // short, plain-language headline
  detail: string; // the numbers and a tip
  time: number; // where in the video this shows up
  aid?: AidKind; // which training aid to highlight
};

type Input = {
  track: PoseTrack;
  moments: KeyMoments;
  mode: ShotMode;
  angle: CameraAngle;
};

/**
 * Turn the pose data into golfer-friendly findings. Only metrics that make
 * sense for the shot type and camera angle are included.
 */
export function analyzeSwing(input: Input): Finding[] {
  const { track, moments, mode, angle } = input;
  const address = poseAt(track, moments.address);
  const impact = poseAt(track, moments.impact);
  const top = poseAt(track, moments.top);
  if (!address || !impact || !top) return [];

  const ctx: Context = {
    ...input,
    address,
    impact,
    top,
    // Pixels per inch, using the golfer's own torso as a ruler.
    pxPerInch: torsoLength(address, track) / ANALYSIS_CONFIG.torsoInches,
    // +1 if the target is to the right on screen, -1 if to the left
    // (the hands go back away from the target).
    targetSide: -Math.sign(handsPosition(top, track).x - handsPosition(address, track).x) || 1,
    // Down the line: +1 if the ball is to the right of the golfer.
    ballSide:
      Math.sign(
        handsPosition(address, track).x -
          mid(px(address, LM.leftHip, track), px(address, LM.rightHip, track)).x,
      ) || 1,
  };

  const findings = [tempo(ctx), headMovement(ctx)];
  if (mode === "full-swing") {
    findings.push(angle === "face-on" ? hipSway(ctx) : spineAngle(ctx));
  } else {
    findings.push(lowerBody(ctx));
  }
  return findings.filter((f): f is Finding => f !== null);
}

type Context = Input & {
  address: Landmark[];
  impact: Landmark[];
  top: Landmark[];
  pxPerInch: number;
  targetSide: number;
  ballSide: number;
};

// ---------- Metrics ----------

function tempo({ track, moments, mode }: Context): Finding | null {
  // The backswing starts when the club starts moving: a moment before the
  // hands do (but never before the address marker).
  const takeaway = takeawayTime(track, moments) - CLUB_LEAD[mode];
  const back = moments.top - Math.max(takeaway, moments.address);
  const down = moments.impact - moments.top;
  if (back <= 0 || down <= 0) return null;
  const ratio = back / down;
  const { ideal, min, max } = ANALYSIS_CONFIG.tempo[mode];
  const forward = mode === "full-swing" ? "downswing" : "forward stroke";
  const back_ = mode === "full-swing" ? "backswing" : "backstroke";
  const numbers = `${cap(back_)} ${back.toFixed(2)}s, ${forward} ${down.toFixed(2)}s.`;
  const r = ratio.toFixed(1);

  if (ratio >= min && ratio <= max) {
    return {
      id: "tempo",
      status: "strength",
      title: `Smooth tempo: ${r} to 1`,
      detail: `${numbers} That's right around the ideal of about ${ideal} to 1.`,
      time: moments.top,
    };
  }
  return {
    id: "tempo",
    status: "improve",
    title:
      ratio < min
        ? `Your ${back_} is rushed (${r} to 1)`
        : `Your ${forward} is slow compared to your ${back_} (${r} to 1)`,
    detail:
      ratio < min
        ? `${numbers} Aim for about ${ideal} to 1: take it back a little slower and let the ${forward} be quick.`
        : `${numbers} Aim for about ${ideal} to 1: let the club speed up through the ball instead of guiding it.`,
    time: moments.top,
  };
}

function headMovement({ track, moments, mode, angle, address, impact, pxPerInch, targetSide, ballSide }: Context): Finding {
  const a = headCenter(address, track);
  const b = headCenter(impact, track);
  const dx = (b.x - a.x) / pxPerInch;
  const dy = (b.y - a.y) / pxPerInch; // positive = down
  const total = Math.hypot(dx, dy);
  const limit = ANALYSIS_CONFIG.headMovementInches[mode];

  if (total <= limit) {
    return {
      id: "head",
      status: "strength",
      title: "Your head stayed steady through impact",
      detail: `It moved ${inches(total)} from address (goal: under ${limit} in).`,
      time: moments.impact,
      aid: "head",
    };
  }

  // Describe the biggest part of the movement in golf terms.
  let title: string;
  if (Math.abs(dy) > Math.abs(dx)) {
    title = dy < 0 ? `Your head rose ${inches(-dy)} by impact` : `Your head dipped ${inches(dy)} by impact`;
  } else if (angle === "face-on") {
    title =
      dx * targetSide > 0
        ? `Your head slid ${inches(Math.abs(dx))} toward the target by impact`
        : `Your head drifted ${inches(Math.abs(dx))} away from the target by impact`;
  } else {
    title =
      dx * ballSide > 0
        ? `Your head moved ${inches(Math.abs(dx))} toward the ball by impact`
        : `Your head moved ${inches(Math.abs(dx))} back away from the ball by impact`;
  }
  return {
    id: "head",
    status: "improve",
    title,
    detail: `In total it moved ${inches(total)} (goal: under ${limit} in). Try to keep your head inside the blue circle until the ball is gone.`,
    time: moments.impact,
    aid: "head",
  };
}

function hipSway({ track, moments, address, pxPerInch, targetSide }: Context): Finding {
  // The trail hip is the one further from the target.
  const left = px(address, LM.leftHip, track);
  const right = px(address, LM.rightHip, track);
  const trail = left.x * targetSide < right.x * targetSide ? LM.leftHip : LM.rightHip;
  const start = px(address, trail, track).x;

  // Furthest the trail hip drifts away from the target during the backswing.
  let worst = { sway: 0, time: moments.top };
  for (const f of track.frames) {
    if (!f.landmarks || f.time < moments.address || f.time > moments.top) continue;
    const sway = ((start - px(f.landmarks, trail, track).x) * targetSide) / pxPerInch;
    if (sway > worst.sway) worst = { sway, time: f.time };
  }
  const limit = ANALYSIS_CONFIG.hipSwayInches;

  if (worst.sway <= limit) {
    return {
      id: "hips",
      status: "strength",
      title: "Your hips turned without swaying on the backswing",
      detail: `Your trail hip stayed within ${inches(worst.sway)} of the hip line (goal: under ${limit} in).`,
      time: worst.time,
      aid: "hips",
    };
  }
  return {
    id: "hips",
    status: "improve",
    title: `Your hips swayed ${inches(worst.sway)} away from the target on the backswing`,
    detail: `Goal: under ${limit} in. Turn your hips instead of sliding them, so your trail hip stays inside the orange line.`,
    time: worst.time,
    aid: "hips",
  };
}

function spineAngle({ track, moments, address, impact }: Context): Finding {
  const tilt = (lms: Landmark[]) => {
    const hips = mid(px(lms, LM.leftHip, track), px(lms, LM.rightHip, track));
    const shoulders = mid(px(lms, LM.leftShoulder, track), px(lms, LM.rightShoulder, track));
    return tiltFromVertical(hips, shoulders);
  };
  const before = tilt(address);
  const after = tilt(impact);
  const change = after - before; // negative = stood up
  const limit = ANALYSIS_CONFIG.spineAngleChangeDegrees;
  const numbers = `Address ${Math.round(before)}°, impact ${Math.round(after)}°.`;

  if (Math.abs(change) <= limit) {
    return {
      id: "spine",
      status: "strength",
      title: "You held your posture through impact",
      detail: `Your spine angle changed only ${Math.round(Math.abs(change))}°. ${numbers}`,
      time: moments.impact,
      aid: "spine",
    };
  }
  return {
    id: "spine",
    status: "improve",
    title:
      change < 0
        ? `You stood up ${Math.round(-change)}° by impact (early extension)`
        : `You bent over ${Math.round(change)}° more by impact`,
    detail:
      change < 0
        ? `${numbers} Keep your chest over the ball and your hips back through impact.`
        : `${numbers} Try to keep the same bend from address all the way to impact.`,
    time: moments.impact,
    aid: "spine",
  };
}

function lowerBody({ track, moments, mode, address, pxPerInch }: Context): Finding {
  const anchor = (lms: Landmark[]) =>
    mid(
      mid(px(lms, LM.leftHip, track), px(lms, LM.rightHip, track)),
      mid(px(lms, LM.leftKnee, track), px(lms, LM.rightKnee, track)),
    );
  const start = anchor(address);

  let worst = { move: 0, time: moments.impact };
  for (const f of track.frames) {
    if (!f.landmarks || f.time < moments.address || f.time > moments.impact) continue;
    const p = anchor(f.landmarks);
    const move = Math.hypot(p.x - start.x, p.y - start.y) / pxPerInch;
    if (move > worst.move) worst = { move, time: f.time };
  }
  const limit = ANALYSIS_CONFIG.lowerBodyMovementInches[mode === "putt" ? "putt" : "chip"];

  if (worst.move <= limit) {
    return {
      id: "lower-body",
      status: "strength",
      title: "Your lower body stayed quiet",
      detail: `Your hips and knees moved ${inches(worst.move)} during the stroke (goal: under ${limit} in).`,
      time: worst.time,
      aid: "spine",
    };
  }
  return {
    id: "lower-body",
    status: "improve",
    title: `Your lower body moved ${inches(worst.move)} during the stroke`,
    detail: `Goal: under ${limit} in. Keep your legs still and let your arms and shoulders control the ${mode}.`,
    time: worst.time,
    aid: "spine",
  };
}

// ---------- Wording helpers ----------

/** "less than an inch", "about 1 inch", "about 2.5 inches" */
function inches(value: number) {
  if (value < 1) return "less than an inch";
  const rounded = Math.round(value * 2) / 2;
  return `about ${rounded} ${rounded === 1 ? "inch" : "inches"}`;
}

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}
