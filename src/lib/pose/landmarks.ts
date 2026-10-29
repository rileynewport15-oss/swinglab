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
// z is MediaPipe's depth estimate (toward/away from the camera), on roughly
// the same scale as x; smaller = closer to the camera. Used for turn angles.
export type Landmark = { x: number; y: number; z?: number; visibility: number };

export type PoseFrame = { time: number; landmarks: Landmark[] | null };

export type PoseTrack = {
  frames: PoseFrame[];
  width: number; // video size in pixels
  height: number;
  step: number; // seconds between analyzed frames (before the swing gets a closer look)
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

/** Where the hands are (average of wrists and index knuckles), in video pixels. */
export function handsPosition(lms: Landmark[], track: Pick<PoseTrack, "width" | "height">): Px {
  const points = [LM.leftWrist, LM.rightWrist, LM.leftIndex, LM.rightIndex].map((i) => px(lms, i, track));
  return {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  };
}

/**
 * Middle of the head, from the ears and nose, in video pixels.
 *
 * MediaPipe's "ear" points sit low and forward on the side of the face, and
 * the skull extends behind and above them (especially when the golfer is
 * turned sideways and looking down at the ball). So we start at the ears and
 * move away from the nose, toward the back and top of the head.
 */
export function headCenter(lms: Landmark[], track: Pick<PoseTrack, "width" | "height">): Px {
  const ears = mid(px(lms, LM.leftEar, track), px(lms, LM.rightEar, track));
  const nose = px(lms, LM.nose, track);
  return { x: ears.x + (ears.x - nose.x) * 0.3, y: ears.y + (ears.y - nose.y) * 0.3 };
}

/** The pose frame closest to a time (only frames where a golfer was found). */
export function nearestFrame(track: PoseTrack, time: number): PoseFrame | null {
  let best: PoseFrame | null = null;
  for (const f of track.frames) {
    if (f.landmarks && (!best || Math.abs(f.time - time) < Math.abs(best.time - time))) best = f;
  }
  return best;
}
