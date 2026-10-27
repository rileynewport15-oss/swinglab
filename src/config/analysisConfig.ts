// ─────────────────────────────────────────────────────────────────────────────
// Swing analysis thresholds: everything that decides "Strength" vs
// "Area to improve" lives here. Adjust these numbers to make the feedback
// stricter or more forgiving.
// ─────────────────────────────────────────────────────────────────────────────

export type ShotMode = "full-swing" | "chip" | "putt";

export const ANALYSIS_CONFIG = {
  // Distances are measured on the video in "torso lengths" (shoulder joint to
  // hip joint) and converted to inches with this average adult value.
  torsoInches: 19,

  // Tempo = backswing time ÷ downswing time. Inside [min, max] is a strength.
  tempo: {
    "full-swing": { ideal: 3, min: 2.5, max: 3.5 },
    chip: { ideal: 2, min: 1.6, max: 3 },
    putt: { ideal: 2, min: 1.6, max: 2.5 },
  },

  // Head movement from address to impact, in inches. At or below = steady.
  headMovementInches: {
    "full-swing": 2,
    chip: 1,
    putt: 0.75,
  },

  // Full swing, Face On: how far the trail hip may drift away from the target
  // (outside the address hip line) during the backswing, in inches.
  hipSwayInches: 1.5,

  // Full swing, Down the Line: change in spine angle from address to impact,
  // in degrees. Standing up more than this = early extension / losing posture.
  spineAngleChangeDegrees: 5,

  // Chip and Putt: how much the hips and knees may move from address to
  // impact, in inches.
  lowerBodyMovementInches: {
    chip: 1.5,
    putt: 1,
  },
} as const;
