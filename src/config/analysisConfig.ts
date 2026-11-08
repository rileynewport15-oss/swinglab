// ─────────────────────────────────────────────────────────────────────────────
// Swing analysis thresholds: everything that decides "Strength" vs a minor or
// major "Area to improve" lives here. Adjust these numbers to make the
// feedback stricter or more forgiving.
//
// Most checks use two numbers: past `minor` it's a minor issue, past `major`
// it's a major one. Anything inside `minor` counts as a strength.
// ─────────────────────────────────────────────────────────────────────────────

export type ShotMode = "full-swing" | "putt";

type Limits = { minor: number; major: number };

export const ANALYSIS_CONFIG = {
  // Distances are measured on the video in "torso lengths" (shoulder joint to
  // hip joint) and converted to inches with this average adult value.
  torsoInches: 19,

  // A check is skipped unless MediaPipe's average confidence (0–1) in the body
  // points it uses is at least this high.
  minConfidence: 0.6,

  // ── Cleaning the pose data ────────────────────────────────────────────────
  smoothing: {
    // Frames where MediaPipe's average confidence in the shoulders and hips is
    // below this are dropped (the golfer was blurred, hidden or mistaken).
    minFrameVisibility: 0.5,
    // Each landmark is averaged with its neighbors within this many seconds
    // either side (weighted toward the middle frame and by confidence). Small,
    // so the fast downswing isn't blurred: it only reaches the close-look
    // frames (60 per second), not the quick first pass (15 per second).
    windowSeconds: 0.035,
  },
  // Positions at each key moment are averaged over this many seconds either
  // side, instead of trusting a single frame. Shorter where the body moves fast.
  keyPoseWindow: { address: 0.1, top: 0.04, impact: 0.02, finish: 0.1 },

  // ── Confidence shown on each result ───────────────────────────────────────
  // A result's confidence is the lowest of four scores (0–1):
  // - how clearly MediaPipe saw the body points it uses (visibility),
  // - how big the golfer is in the frame (pixels per inch),
  // - how reliable this measurement is from video (`reliability`, from the
  //   audit: how much it moved between runs and how well it matched the frames),
  // - how far the reading is from the line between two verdicts, compared
  //   with that measurement's typical run-to-run wobble (`noise`). A reading
  //   right on a threshold could easily have gone the other way.
  confidence: {
    levels: { high: 0.75, medium: 0.5, low: 0.3 }, // below `low` the result is hidden
    visibility: { from: 0.5, full: 0.85 },
    pixelsPerInch: { from: 4, full: 8 },
    // The share of the score a reading right on a threshold keeps.
    onThreshold: 0.35,
    reliability: {
      tempo: 0.85,
      posture: 0.95,
      takeaway: 0.75,
      leadArm: 0.6,
      plane: 0.8,
      earlyExtension: 0.9,
      hipDepth: 0.65, // hip points sit under the arms at impact: 2 vs 3 in across runs
      headHeight: 0.85,
      trailKnee: 0.85,
      hipSway: 0.7,
      headLateral: 0.65,
      weightShift: 0.85,
      reverseTilt: 0.85,
      shoulderTurn: 0.45, // depth estimate: 59–85° on the same swing across runs
      sequencing: 0.6,
      finish: 0.8,
      chickenWing: 0.75,
      puttTempo: 0.9,
      strokeLength: 0.9,
      puttHead: 0.85,
      puttLowerBody: 0.85,
      triangle: 0.8,
      shoulderRock: 0.8,
      acceleration: 0.75,
      strokePath: 0.6, // down the line, perspective adds ~1 in
      eyeLine: 0.85,
    },
    // Typical run-to-run wobble of each reading, in its own units.
    noise: {
      tempo: 0.25,
      posture: 2,
      takeaway: 1.5,
      leadArm: 8,
      plane: 1,
      earlyExtension: 1.5, // degrees of spine angle
      hipDepth: 0.75,
      headHeight: 0.75,
      trailKnee: 4,
      hipSway: 0.75,
      headLateral: 1,
      weightShift: 0.75,
      reverseTilt: 2,
      shoulderTurn: 8,
      sequencing: 0.03, // seconds
      finish: 0.05,
      chickenWing: 6,
      puttTempo: 0.15,
      strokeLength: 0.1,
      puttHead: 0.5,
      puttLowerBody: 0.4,
      triangle: 1.5,
      shoulderRock: 0.08,
      acceleration: 0.06,
      strokePath: 0.75,
      eyeLine: 0.5,
    },
  },

  fullSwing: {
    // Tempo = backswing time ÷ downswing time. Inside [goodMin, goodMax] is a
    // strength; outside [okMin, okMax] is a major issue; in between is minor.
    // The 3-to-1 standard is timed on the club, but we can only see the hands,
    // and the club keeps going back after the hands stop: checked frame by
    // frame on two swings, the club reached the top ~0.06 s later. So the top
    // is moved this much later for tempo.
    tempo: { ideal: 3, goodMin: 2.5, goodMax: 3.5, okMin: 2, okMax: 4.5 },
    clubTopLagSeconds: 0.06,

    // The phases of the swing, for grouping the results. The transition is the
    // first part of the downswing (this share of the time from top to impact).
    transitionShare: 0.35,
    // Finish: after impact the hands rise and stop. They count as stopped below
    // this speed (torso lengths per second).
    finishStillSpeed: 0.6,

    // Sequencing (face on): when the hips start toward the target and when the
    // arms start the club down, after the top. A movement starts when it's
    // faster than `startSpeed` / `handsStartSpeed` (torso lengths per second).
    // The hips should go first: if the arms start more than `minor` / `major`
    // seconds BEFORE the hips, it's flagged. The two are timed with different
    // speeds, so there's some slack; on the three face on test swings the
    // arms led by -0.02 to +0.03 s.
    sequencing: { startSpeed: 0.5, handsStartSpeed: 1.2, minor: 0.05, major: 0.1 },

    // Finish and balance (both angles), judged over `holdSeconds` after the
    // finish (skipped if the video ends sooner than `minSeconds` after it).
    // - Hold: the head and hips should move sideways less than `holdTorso`
    //   torso lengths (more = a stumble or a step). Only sideways: golfers
    //   naturally stand up and relax out of the finish after half a second
    //   (checked on IMG_6220), which isn't losing balance.
    // - Face on: hips over the lead foot. 0 = over the trail foot, 1 = over the
    //   lead foot; below `weightForward.minor` / `.major` it's flagged.
    finish: {
      holdSeconds: 0.5,
      // The positions at the start and end of the hold are each averaged over
      // this long, so frame-to-frame jitter doesn't count as movement.
      edgeSeconds: 0.12,
      minSeconds: 0.4,
      holdTorso: { minor: 0.15, major: 0.3 } as Limits,
      weightForward: { minor: 0.7, major: 0.5 },
    },

    downTheLine: {
      // Start of the downswing (first 40%): how far the hands move out toward
      // the ball (over the top) or in behind the golfer (stuck), in inches.
      // Later in the downswing the hands move too fast for reliable tracking.
      overTheTopInches: { minor: 4, major: 7 } as Limits,
      underPlaneInches: { minor: 6, major: 9 } as Limits,
      // Takeaway: when the hands reach hip height in the backswing, how far
      // they've moved in toward the body or out toward the ball since address,
      // in inches. Some inward movement is normal (more with a driver); these
      // were set from real swings that looked neutral (2.5–9 in inward).
      takeawayInsideInches: { minor: 12, major: 16 } as Limits,
      takeawayOutsideInches: { minor: 2, major: 5 } as Limits,
      // Lead arm at the top: degrees of bend at the elbow (0 = straight).
      leadArmBendDegrees: { minor: 25, major: 45 } as Limits,
      // From down the line the lead arm is on the far side of the body and
      // often hidden at the top, so only judge it when it's clearly visible.
      leadArmMinConfidence: 0.85,
      // Posture at address. Spine tilt = forward bend from vertical, degrees.
      spineTilt: { min: 28, max: 48 },
      // Knee flex = how much the knees bend at address, degrees (0 = locked straight).
      kneeFlex: { min: 8, max: 35 },
      // Standing up through impact: spine angle lost from address, degrees.
      spineAngleLossDegrees: { minor: 5, major: 10 } as Limits,
      // Hips moving toward the ball by impact (loss of hip depth), inches.
      hipDepthLossInches: { minor: 2, major: 4 } as Limits,
      // Head dropping down or lifting up during the swing, inches.
      headDipLiftInches: { minor: 2, major: 4 } as Limits,
      // Trail knee straightening in the backswing: degrees of flex lost from
      // address to the top (the trail leg is the one nearer the camera).
      trailKneeLossDegrees: { minor: 12, major: 20 } as Limits,
    },
    faceOn: {
      // Trail hip drifting away from the target in the backswing, inches.
      // Checked on real swings: the hip landmark reads ~1 in more than the
      // visible hip edge (the pelvis turning moves it), so this allows for that
      // (real ~2 in reads as ~3 in).
      hipSwayInches: { minor: 3, major: 4.5 } as Limits,
      // Head sliding toward the target by impact, inches. From the front, the
      // head landmarks move ~1–2 in when the head simply rotates to look through
      // the shot (checked frame by frame), so small readings aren't flagged.
      headSlideTowardTargetInches: { minor: 3, major: 5 } as Limits,
      // Head drifting away from the target by impact, inches (a little is normal).
      headDriftAwayInches: { minor: 3, major: 5 } as Limits,
      // Weight shift: hips should move toward the target by impact, inches.
      // Less than `minor` = minor issue; less than `major` (e.g. backward) = major.
      weightShiftInches: { minor: 1.5, major: 0 },
      // Reverse spine tilt: upper body leaning toward the target at the top, degrees.
      reverseTiltDegrees: { minor: 3, major: 8 } as Limits,
      // Estimated shoulder turn at the top, degrees. Below `minor` = minor issue,
      // below `major` = major issue.
      shoulderTurnDegrees: { minor: 75, major: 60 },
      // Lead arm just after impact (hands back at hip height): degrees of bend
      // at the lead elbow. Bending it ("chicken wing") is flagged.
      chickenWingDegrees: { minor: 30, major: 45 } as Limits,
    },
  },

  // ── Putting ───────────────────────────────────────────────────────────────
  putting: {
    // Tempo = backstroke time ÷ forward stroke time (end of backstroke to
    // impact). Same scheme as the full swing.
    tempo: { ideal: 2, goodMin: 1.6, goodMax: 2.5, okMin: 1.3, okMax: 3 },

    // Face On: follow-through length ÷ backstroke length (hands, along the
    // target line). It should be about equal or a bit longer. Shorter than
    // `short.minor` is a minor issue (decelerating), shorter than `short.major`
    // a major one; longer than `long.minor` / `long.major` likewise (usually a
    // short, jabby backstroke).
    strokeLengthRatio: { short: { minor: 0.85, major: 0.65 }, long: { minor: 1.9, major: 2.6 } },

    // Head movement from setup to impact (measured from the feet), inches.
    // The ear landmarks wobble ~0.5–1 in on still heads (checked frame by
    // frame on real putts), so smaller limits flag steady heads.
    headMovementInches: { minor: 1.5, major: 2.5 } as Limits,
    // Hips and knees movement during the stroke (measured from the feet), inches.
    lowerBodyMovementInches: { minor: 1, major: 2 } as Limits,

    // Face On wrist breakdown, two ways (either one past its limit counts):
    // - Triangle: how much the pendulum triangle (both shoulders and the
    //   hands) changes shape, in degrees: the hands swinging ahead of or behind
    //   where the rocking shoulders would carry them. Good strokes measured
    //   3–5° (tracking wobble).
    // - Lead wrist: change in the angle between the lead forearm and hand, in
    //   degrees. A wrist flick barely moves the triangle's corner (the wrists
    //   are the corner), so this catches it. Good strokes measured 3–8°.
    // Through impact (end of backstroke to just after impact) is what matters
    // most; the backstroke gets `backstrokeAllowance` times more room.
    triangleChangeDegrees: { minor: 7, major: 12 } as Limits,
    leadWristChangeDegrees: { minor: 12, major: 20 } as Limits,
    backstrokeAllowance: 1.5,

    // Face On: share of the hands' swing that comes from the shoulders
    // rocking (1 = all shoulders, a perfect pendulum). Below `minor` = minor
    // issue (arms and hands doing the work), below `major` = major.
    shoulderRockShare: { minor: 0.7, major: 0.5 },

    // Down the Line: how far the hand moves in toward the body or out toward
    // the ball at the end of the backstroke and at the finish, inches. A
    // gentle arc is normal; the hands move much less than the putter head.
    // Perspective adds up to ~1 in (the hands come toward the camera going
    // back and move away through), so smaller limits flag straight strokes.
    strokePathInches: { minor: 2, major: 3.5 } as Limits,
    // Down the Line: eyes over the ball. Inches the eyes are inside the ball
    // (between the ball and the feet) or outside it, at setup.
    eyesInsideBallInches: { minor: 2, major: 4 } as Limits,
    eyesOutsideBallInches: { minor: 0.75, major: 2 } as Limits,

    // Face On: accelerating through impact. The hands' speed at impact as a
    // share of their top speed in the forward stroke; a stroke that peaks
    // before impact and arrives slower is decelerating. Below `minor` /
    // `major` it's flagged (only when the top speed came more than
    // `peakBeforeSeconds` before impact).
    impactSpeedShare: { minor: 0.88, major: 0.75 },
    peakBeforeSeconds: 0.03,
  },
} as const;
