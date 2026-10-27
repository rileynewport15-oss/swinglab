// Shared pose types and the MediaPipe landmark numbers we use.
// Full list: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker

export const LM = {
  nose: 0,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftIndex: 19,
  rightIndex: 20,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftToe: 31,
  rightToe: 32,
} as const;

// x and y are fractions of the video frame (0–1), the same "video coordinates"
// our drawings use, so landmarks can be turned into shapes directly.
export type Landmark = { x: number; y: number; visibility: number };

export type PoseFrame = { time: number; landmarks: Landmark[] | null };

export type PoseTrack = {
  frames: PoseFrame[];
  width: number; // video size in pixels
  height: number;
  step: number; // seconds between analyzed frames
};

export type Px = { x: number; y: number };

/** A landmark in video pixels (so distances aren't stretched by the aspect ratio). */
export function px(lms: Landmark[], index: number, track: Pick<PoseTrack, "width" | "height">): Px {
  return { x: lms[index].x * track.width, y: lms[index].y * track.height };
}

export function mid(a: Px, b: Px): Px {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function distance(a: Px, b: Px) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Shoulder-midpoint to hip-midpoint length: our "body size" ruler. */
export function torsoLength(lms: Landmark[], track: Pick<PoseTrack, "width" | "height">) {
  const shoulders = mid(px(lms, LM.leftShoulder, track), px(lms, LM.rightShoulder, track));
  const hips = mid(px(lms, LM.leftHip, track), px(lms, LM.rightHip, track));
  return distance(shoulders, hips);
}
