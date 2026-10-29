import { LM, distance, px, torsoLength, type PoseTrack } from "./landmarks";

// The golfer's feet stay planted while they set up and swing (at the finish
// only one foot moves). If BOTH feet suddenly appear to move fast, by the same
// amount in the same direction, the camera itself moved (e.g. it panned to
// follow the ball), and everything after that would look like huge body
// movement. In a swing the feet can both twitch (heel lift, ankle roll), but
// not in lockstep. Speed is in torso lengths per second.
const CAMERA_MOVE_SPEED = 1;
const SAME_MOTION = 0.35; // the feet's movements differ by less than this share
const SPAN = 0.25; // seconds between compared frames, to smooth out jitter
const SKIP_START = 0.5; // ignore the first moments while the recording settles

/** The time the camera starts moving, or null if it stays still. */
export function cameraMoveTime(track: PoseTrack): number | null {
  const frames = track.frames.filter((f) => f.landmarks);
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].time < SKIP_START) continue;
    let j = i - 1;
    while (j > 0 && frames[i].time - frames[j].time < SPAN) j--;
    const now = frames[i].landmarks!;
    const before = frames[j].landmarks!;
    const ruler = torsoLength(now, track) || 1;
    const dt = frames[i].time - frames[j].time;
    const move = (k: number) => {
      const a = px(now, k, track);
      const b = px(before, k, track);
      return { x: a.x - b.x, y: a.y - b.y };
    };
    const left = move(LM.leftAnkle);
    const right = move(LM.rightAnkle);
    const slower = Math.min(Math.hypot(left.x, left.y), Math.hypot(right.x, right.y));
    const together = distance(left, right) < slower * SAME_MOTION;
    if (together && slower / ruler / dt > CAMERA_MOVE_SPEED) return frames[j].time;
  }
  return null;
}

/** Keep only the part of the video before the camera moved. */
export function beforeCameraMove(track: PoseTrack): PoseTrack {
  const cut = cameraMoveTime(track);
  return cut === null ? track : { ...track, frames: track.frames.filter((f) => f.time < cut) };
}
