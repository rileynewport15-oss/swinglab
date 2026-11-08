import { LM, px, torsoLength, type PoseTrack } from "./landmarks";
import type { CameraAngle } from "./autoAids";

// Seen from the front, the shoulders are about 0.8 torso lengths apart; from
// down the line one is behind the other (about 0.1–0.3).
const FACE_ON_SHOULDERS = 0.5;
// Looked at around address/setup, where the golfer is still and square.
const WINDOW = 0.5;

/**
 * Which way the camera looks at the golfer, from the pose itself: how far
 * apart the shoulders look compared with the torso. Measured around `time`
 * (the address or setup position) when given, otherwise over the whole clip.
 */
export function detectView(track: PoseTrack, time?: number): CameraAngle {
  const frames = track.frames.filter(
    (f) => f.landmarks && (time === undefined || Math.abs(f.time - time) <= WINDOW),
  );
  const widths = frames.map(({ landmarks: lms }) => {
    const ruler = torsoLength(lms!, track) || 1;
    return Math.abs(px(lms!, LM.leftShoulder, track).x - px(lms!, LM.rightShoulder, track).x) / ruler;
  });
  if (widths.length === 0) return "face-on";
  const sorted = [...widths].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] >= FACE_ON_SHOULDERS ? "face-on" : "down-the-line";
}
