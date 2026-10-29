import { LM, handsPosition, mid, px, torsoLength, type Landmark, type PoseTrack, type Px } from "../pose/landmarks";

// Finding the ball in the setup frame (down the line), for the eyes-over-the-
// ball check. Pose detection doesn't see the ball, so we look at the picture:
// a small, round, white blob on the ground beyond the toes, about the size a
// golf ball would be for this golfer.

const BALL_INCHES = 1.68;
const TORSO_INCHES = 19;
// A pixel counts as white: bright, and nearly gray (grass is green, the
// putter dark).
const MIN_BRIGHT = 165;
const MAX_TINT = 50;

/** Where the ball is at setup, in video pixels, or null if it can't be found. */
export async function findBall(url: string, time: number, lms: Landmark[], track: PoseTrack): Promise<Px | null> {
  const image = await grabFrame(url, time, track);
  if (!image) return null;

  const P = (i: number) => px(lms, i, track);
  const ruler = torsoLength(lms, track);
  const hands = handsPosition(lms, track);
  const hips = mid(P(LM.leftHip), P(LM.rightHip));
  const toes = mid(P(LM.leftToe), P(LM.rightToe));
  const ground = Math.max(P(LM.leftHeel).y, P(LM.rightHeel).y, toes.y);
  // The golfer faces the side the hands hang toward; the ball is out there.
  const facing = Math.sign(hands.x - hips.x) || 1;
  const xs = [toes.x + facing * ruler * 0.1, toes.x + facing * ruler * 2.2];
  const region = {
    x0: Math.max(0, Math.round(Math.min(...xs))),
    x1: Math.min(track.width - 1, Math.round(Math.max(...xs))),
    y0: Math.max(0, Math.round(ground - ruler * 0.9)),
    y1: Math.min(track.height - 1, Math.round(ground + ruler * 0.25)),
  };
  const expected = (BALL_INCHES * ruler) / TORSO_INCHES;

  const blobs = whiteBlobs(image, region);
  let best: { center: Px; score: number } | null = null;
  for (const b of blobs) {
    const w = b.x1 - b.x0 + 1;
    const h = b.y1 - b.y0 + 1;
    const size = (w + h) / 2;
    // Round, filled (a circle fills ~79% of its box) and about ball-sized.
    if (w / h < 0.6 || w / h > 1.7 || b.count / (w * h) < 0.45) continue;
    if (size < expected * 0.45 || size > expected * 1.9) continue;
    const score = Math.abs(Math.log(size / expected));
    if (!best || score < best.score) best = { center: { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 }, score };
  }
  return best?.center ?? null;
}

type Blob = { x0: number; y0: number; x1: number; y1: number; count: number };

/** Groups of touching white pixels inside the region. */
function whiteBlobs(image: ImageData, r: { x0: number; y0: number; x1: number; y1: number }): Blob[] {
  const { data, width } = image;
  const w = r.x1 - r.x0 + 1;
  const h = r.y1 - r.y0 + 1;
  if (w <= 0 || h <= 0) return [];
  const white = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((r.y0 + y) * width + r.x0 + x) * 4;
      const lo = Math.min(data[i], data[i + 1], data[i + 2]);
      const hi = Math.max(data[i], data[i + 1], data[i + 2]);
      if (lo >= MIN_BRIGHT && hi - lo <= MAX_TINT) white[y * w + x] = 1;
    }
  }
  const blobs: Blob[] = [];
  const stack: number[] = [];
  for (let start = 0; start < white.length; start++) {
    if (white[start] !== 1) continue;
    const blob = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, count: 0 };
    white[start] = 2;
    stack.push(start);
    while (stack.length) {
      const k = stack.pop()!;
      const x = k % w;
      const y = (k - x) / w;
      blob.count++;
      blob.x0 = Math.min(blob.x0, x + r.x0);
      blob.x1 = Math.max(blob.x1, x + r.x0);
      blob.y0 = Math.min(blob.y0, y + r.y0);
      blob.y1 = Math.max(blob.y1, y + r.y0);
      for (const n of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1]) {
        if (n >= 0 && white[n] === 1) {
          white[n] = 2;
          stack.push(n);
        }
      }
    }
    blobs.push(blob);
  }
  return blobs;
}

/** One video frame as pixels, at the size the pose was measured in. */
async function grabFrame(url: string, time: number, track: PoseTrack): Promise<ImageData | null> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("loadeddata", () => resolve(), { once: true });
      video.addEventListener("error", () => reject(new Error("video failed to load")), { once: true });
    });
    video.currentTime = time;
    await new Promise<void>((resolve) => video.addEventListener("seeked", () => resolve(), { once: true }));
    const canvas = document.createElement("canvas");
    canvas.width = track.width;
    canvas.height = track.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, track.width, track.height);
    return ctx.getImageData(0, 0, track.width, track.height);
  } catch {
    return null;
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}
