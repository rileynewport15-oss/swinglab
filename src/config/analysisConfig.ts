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

  // Tempo = backswing time ÷ downswing time. Inside [goodMin, goodMax] is a
  // strength; outside [okMin, okMax] is a major issue; in between is minor.
  tempo: {
    "full-swing": { ideal: 3, goodMin: 2.5, goodMax: 3.5, okMin: 2, okMax: 4.5 },
    putt: { ideal: 2, goodMin: 1.6, goodMax: 2.5, okMin: 1.3, okMax: 3 },
  },

  fullSwing: {
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
      hipSwayInches: { minor: 1.5, major: 3 } as Limits,
      // Head sliding toward the target by impact, inches.
      headSlideTowardTargetInches: { minor: 2, major: 4 } as Limits,
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

  putt: {
    // Head movement from address to impact, inches.
    headMovementInches: { minor: 0.75, major: 1.5 } as Limits,
    // Hips and knees movement during the stroke, inches.
    lowerBodyMovementInches: { minor: 1, major: 2 } as Limits,
    // Face On: change in the lead wrist angle during the stroke, degrees.
    wristBreakdownDegrees: { minor: 10, major: 20 } as Limits,
    // Face On: follow-through length ÷ backstroke length. Below `minor` = minor
    // issue (decelerating), below `major` = major.
    followThroughRatio: { minor: 0.8, major: 0.6 },
  },
} as const;
