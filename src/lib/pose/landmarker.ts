import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

// The engine files are copied into public/ by scripts/copy-mediapipe.mjs and
// the model lives in public/models, so everything loads from our own site.
const WASM_PATH = "/mediapipe/wasm";
const MODEL_PATH = "/models/pose_landmarker_full.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

/** Load the pose model once and reuse it for every video. */
export function getPoseLandmarker(): Promise<PoseLandmarker> {
  landmarkerPromise ??= (async () => {
    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
    const create = (delegate: "GPU" | "CPU") =>
      PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    // The graphics card is much faster; fall back to the processor if it isn't available.
    try {
      return await create("GPU");
    } catch {
      return await create("CPU");
    }
  })();
  // If loading failed, let the next video try again.
  landmarkerPromise.catch(() => {
    landmarkerPromise = null;
  });
  return landmarkerPromise;
}

// MediaPipe needs every timestamp to be larger than the one before, even
// across passes and videos. It also smooths landmarks over time, so the
// timestamps should follow the video's own clock. Each pass gets its own
// starting point after the previous one, with a gap so smoothing starts fresh.
let lastTimestamp = 0;
export function startPass(): (videoSeconds: number) => number {
  const base = lastTimestamp + 1000;
  let first: number | null = null;
  return (videoSeconds) => {
    first ??= videoSeconds;
    const ts = base + (videoSeconds - first) * 1000;
    lastTimestamp = Math.max(lastTimestamp + 1, ts);
    return lastTimestamp;
  };
}
