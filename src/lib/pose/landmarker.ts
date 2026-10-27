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
// across different videos, so we hand out increasing numbers.
let lastTimestamp = 0;
export function nextTimestamp() {
  lastTimestamp = Math.max(performance.now(), lastTimestamp + 1);
  return lastTimestamp;
}
