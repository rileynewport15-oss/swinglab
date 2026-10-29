import { getPoseLandmarker, startPass } from "./landmarker";
import type { PoseFrame, PoseTrack } from "./landmarks";

const MAX_SECONDS = 40; // long clips: only the start matters for address + swing
const TARGET_SAMPLES = 300;
const MIN_FPS = 6;
const MAX_FPS = 15;
// MediaPipe smooths landmarks between frames, so the first few frames of a
// pass lag behind. Start this many seconds early and throw those frames away.
const WARM_UP = 0.3;

type Options = {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
  // Analyze only part of the video, at a chosen rate (used to look closely at the swing).
  start?: number;
  end?: number;
  fps?: number;
};

/**
 * Run pose detection across the video and return the body landmarks for each
 * analyzed frame. Uses its own hidden <video> element so the player the user
 * sees is never touched.
 */
export async function analyzeVideo(
  url: string,
  { onProgress, signal, start = 0, end, fps: requestedFps }: Options = {},
): Promise<PoseTrack> {
  const landmarker = await getPoseLandmarker();
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  try {
    await waitFor(video, "loadeddata");
    const duration = await getDuration(video);
    const stop = Math.min(end ?? duration, duration, start + MAX_SECONDS);
    const length = stop - start;
    // Short clips get up to 15 frames per second; long ones fewer, so analysis stays quick.
    const fps = requestedFps ?? Math.min(MAX_FPS, Math.max(MIN_FPS, TARGET_SAMPLES / length));
    const step = 1 / fps;

    const frames: PoseFrame[] = [];
    const timestamp = startPass();
    for (let t = Math.max(0, start - WARM_UP); t < stop; t += step) {
      if (signal?.aborted) throw new DOMException("Analysis cancelled", "AbortError");
      await seek(video, t);
      const result = landmarker.detectForVideo(video, timestamp(t));
      if (t < start - 1e-6) continue; // warm-up frame
      const pose = result.landmarks[0];
      frames.push({
        time: video.currentTime,
        landmarks: pose ? pose.map(({ x, y, z, visibility }) => ({ x, y, z, visibility })) : null,
      });
      onProgress?.(Math.min(1, (t - start + step) / length));
    }

    return { frames, width: video.videoWidth, height: video.videoHeight, step };
  } finally {
    // Release the decoder.
    video.removeAttribute("src");
    video.load();
  }
}

function waitFor(el: HTMLMediaElement, event: string) {
  return new Promise<void>((resolve, reject) => {
    el.addEventListener(event, () => resolve(), { once: true });
    el.addEventListener("error", () => reject(new Error("Could not read this video")), { once: true });
  });
}

async function seek(video: HTMLVideoElement, time: number) {
  if (Math.abs(video.currentTime - time) < 0.001) return;
  const done = waitFor(video, "seeked");
  video.currentTime = time;
  await done;
}

// Some recorded videos (e.g. from browsers) report an "Infinity" duration
// until you seek to the end, which makes the browser work it out.
async function getDuration(video: HTMLVideoElement) {
  if (Number.isFinite(video.duration)) return video.duration;
  await seek(video, 1e9);
  const duration = video.duration;
  await seek(video, 0);
  return Number.isFinite(duration) ? duration : video.currentTime;
}

/**
 * Swap in a closer look at part of the video: frames from `detail` replace
 * the coarse frames in the time range it covers.
 */
export function mergeDetail(coarse: PoseTrack, detail: PoseTrack): PoseTrack {
  if (detail.frames.length === 0) return coarse;
  const from = detail.frames[0].time;
  const to = detail.frames[detail.frames.length - 1].time;
  const frames = [
    ...coarse.frames.filter((f) => f.time < from || f.time > to),
    ...detail.frames,
  ].sort((a, b) => a.time - b.time);
  return { ...coarse, frames };
}
