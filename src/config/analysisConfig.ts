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

  fullSwing: {
    // Tempo = backswing time ÷ downswing time. Inside [goodMin, goodMax] is a
    // strength; outside [okMin, okMax] is a major issue; in between is minor.
    tempo: { ideal: 3, goodMin: 2.5, goodMax: 3.5, okMin: 2, okMax: 4.5 },

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
  },
} as const;
