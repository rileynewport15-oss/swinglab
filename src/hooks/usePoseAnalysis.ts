"use client";

import { useEffect, useRef, useState } from "react";
import { analyzeVideo, mergeDetail } from "@/lib/pose/analyze";
import { checkQuality, findAddress, type AddressFrame, type QualityProblem } from "@/lib/pose/address";
import { ADDRESS_LEAD, detectKeyMoments, takeawayTime, type KeyMoments } from "@/lib/analysis/keyMoments";
import { distance, handsPosition, nearestFrame, torsoLength, type PoseTrack } from "@/lib/pose/landmarks";
import type { ShotMode } from "@/config/analysisConfig";
import { beforeCameraMove } from "@/lib/pose/cameraMotion";

export type PoseAnalysis =
  | { status: "analyzing"; progress: number } // progress 0–1 (0 while the model loads)
  | { status: "ready"; track: PoseTrack; address: AddressFrame; moments: KeyMoments | null }
  | { status: "failed"; problem: QualityProblem | "error"; track?: PoseTrack };

// Share of the progress bar for the first (whole video) pass; the rest is the
// close look at the swing.
const FIRST_PASS = 0.75;
// The close look covers the swing at 60 samples per second, so the short
// downswing gets enough frames for an accurate tempo and impact.
const DETAIL_FPS = 60;
const MAX_DETAIL_SECONDS = 4;
// Address can move back a little in step 4, so the close look starts this
// many seconds before it.
const DETAIL_BEFORE_ADDRESS = 0.5;
// At most this many steps back for address in step 4 (putts), and only while
// the hands are clearly moving at address (torso lengths per second).
const MAX_ADDRESS_STEPS = 4;
const MOVING_HANDS_SPEED = 0.5;

/**
 * Runs pose detection when a video is loaded. `onReady` is called once with
 * the results so the caller can place the aids.
 */
export function usePoseAnalysis(
  videoUrl: string,
  mode: ShotMode,
  onReady: (track: PoseTrack, address: AddressFrame, moments: KeyMoments | null) => void,
): PoseAnalysis {
  const [analysis, setAnalysis] = useState<PoseAnalysis>({ status: "analyzing", progress: 0 });

  // Always call the latest onReady without restarting the analysis.
  // (Same for the mode: it only fine-tunes address, so changing it doesn't
  // restart the analysis either.)
  const onReadyRef = useRef(onReady);
  const modeRef = useRef(mode);
  useEffect(() => {
    onReadyRef.current = onReady;
    modeRef.current = mode;
  });

  useEffect(() => {
    const controller = new AbortController();
    let lastShown = 0;
    const progress = (p: number) => {
      // Re-render at most every 2% to keep things smooth.
      if (p - lastShown >= 0.02 || p === 1) {
        lastShown = p;
        setAnalysis({ status: "analyzing", progress: p });
      }
    };

    (async () => {
      // 1. Whole video, quickly: find the golfer and the address position.
      // If the camera moves (e.g. pans to follow the ball), only use the part before it.
      const coarse = beforeCameraMove(
        await analyzeVideo(videoUrl, {
          signal: controller.signal,
          onProgress: (p) => progress(p * FIRST_PASS),
        }),
      );
      const lastTime = coarse.frames.at(-1)?.time ?? Infinity;
      let address = findAddress(coarse);
      const problem = checkQuality(coarse, address);
      if (problem || !address) {
        setAnalysis({ status: "failed", problem: problem ?? "not-found", track: coarse });
        return;
      }

      // 2. Rough top and impact, then a close look at that stretch.
      let track = coarse;
      const rough = detectKeyMoments(coarse, address.time);
      if (rough) {
        const start = Math.max(0, address.time - DETAIL_BEFORE_ADDRESS);
        const end = Math.min(rough.impact + 0.4, start + MAX_DETAIL_SECONDS, lastTime);
        const detail = await analyzeVideo(videoUrl, {
          signal: controller.signal,
          start,
          end,
          fps: DETAIL_FPS,
          onProgress: (p) => progress(FIRST_PASS + p * (1 - FIRST_PASS)),
        });
        track = mergeDetail(coarse, detail);
      }

      // 3. Precise top and impact from the detailed frames.
      let moments = detectKeyMoments(track, address.time);

      // 4. A slow takeaway can look like standing still. If the hands were
      //    already moving at "address", move address back to just before the
      //    takeaway started. For putts, repeat: a slow moment in the middle of
      //    the backstroke can look "still" too, and one step back may still
      //    land in the backstroke. (Not for full swings, where the hands often
      //    drift a little before the takeaway.) Top and impact are measured
      //    from where the hands were at address, so they're found again each time.
      const steps = modeRef.current === "putt" ? MAX_ADDRESS_STEPS : 1;
      for (let step = 0; moments && step < steps; step++) {
        if (step > 0 && handSpeed(track, address.time) < MOVING_HANDS_SPEED) break;
        const settled = nearestFrame(track, takeawayTime(track, moments) - ADDRESS_LEAD);
        if (!settled?.landmarks || settled.time >= address.time - 0.01) break;
        address = { index: track.frames.indexOf(settled), time: settled.time, landmarks: settled.landmarks };
        moments = detectKeyMoments(track, settled.time) ?? { ...moments, address: settled.time };
      }

      setAnalysis({ status: "ready", track, address, moments });
      onReadyRef.current(track, address, moments);
    })().catch((err) => {
      if (controller.signal.aborted) return;
      console.error("Pose analysis failed", err);
      setAnalysis({ status: "failed", problem: "error" });
    });

    return () => controller.abort();
  }, [videoUrl]);

  return analysis;
}

/** How fast the hands move just after `time`, in torso lengths per second. */
function handSpeed(track: PoseTrack, time: number): number {
  const a = nearestFrame(track, time);
  const b = nearestFrame(track, time + 0.1);
  if (!a?.landmarks || !b?.landmarks || b.time <= a.time) return 0;
  const ruler = torsoLength(a.landmarks, track) || 1;
  return distance(handsPosition(a.landmarks, track), handsPosition(b.landmarks, track)) / ruler / (b.time - a.time);
}
