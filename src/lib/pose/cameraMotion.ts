import { LM, distance, handsPosition, mid, px, torsoLength, type PoseTrack } from "./landmarks";

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

// After a camera move, skip this long (seconds) before looking for the next one.
const MOVE_GAP = 0.5;

/** Every time the camera starts moving (empty if it stays still). */
export function cameraMoveTimes(track: PoseTrack): number[] {
  const frames = track.frames.filter((f) => f.landmarks);
  const times: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].time < SKIP_START || frames[i].time < (times.at(-1) ?? -Infinity) + MOVE_GAP) continue;
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
    if (together && slower / ruler / dt > CAMERA_MOVE_SPEED) times.push(frames[j].time);
  }
  return times;
}

/**
 * Keep only one stretch of video where the camera stayed still: the first
 * one with a real swing or stroke in it. Each camera move splits the video;
 * a stretch counts once the hands move at least `minAction` torso lengths
 * (from their usual spot near the hips). If none does, the one with the most
 * hand movement is kept. This keeps the swing whether the camera moves after
 * it (panning to follow the ball) or before it (the person filming settling
 * in, or a shuffle of the feet that looked like a camera move).
 */
export function stillCameraPart(track: PoseTrack, minAction: number): PoseTrack {
  const moves = cameraMoveTimes(track);
  if (moves.length === 0) return track;
  const edges = [-Infinity, ...moves, Infinity];
  const parts = edges.slice(1).map((end, k) => ({
    ...track,
    // Leave out the moment of the move itself.
    frames: track.frames.filter((f) => f.time > edges[k] + (k > 0 ? MOVE_GAP / 2 : 0) && f.time < end),
  }));
  const action = (part: PoseTrack) => {
    const offsets = part.frames.flatMap((f) => {
      if (!f.landmarks) return [];
      const hands = handsPosition(f.landmarks, track);
      const hips = mid(px(f.landmarks, LM.leftHip, track), px(f.landmarks, LM.rightHip, track));
      const ruler = torsoLength(f.landmarks, track) || 1;
      return [{ x: (hands.x - hips.x) / ruler, y: (hands.y - hips.y) / ruler }];
    });
    if (offsets.length < 3) return 0;
    const middle = { x: median(offsets.map((o) => o.x)), y: median(offsets.map((o) => o.y)) };
    return Math.max(...offsets.map((o) => distance(o, middle)));
  };
  const scored = parts.map((part) => ({ part, action: action(part) }));
  return (scored.find((s) => s.action >= minAction) ?? scored.reduce((a, b) => (b.action > a.action ? b : a))).part;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
