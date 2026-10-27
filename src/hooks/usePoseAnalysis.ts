"use client";

import { useEffect, useRef, useState } from "react";
import { analyzeVideo, mergeDetail } from "@/lib/pose/analyze";
import { checkQuality, findAddress, type AddressFrame, type QualityProblem } from "@/lib/pose/address";
import { ADDRESS_LEAD, detectKeyMoments, takeawayTime, type KeyMoments } from "@/lib/analysis/keyMoments";
import { nearestFrame, type PoseTrack } from "@/lib/pose/landmarks";

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

/**
 * Runs pose detection when a video is loaded. `onReady` is called once with
 * the results so the caller can place the aids.
 */
export function usePoseAnalysis(
  videoUrl: string,
  onReady: (track: PoseTrack, address: AddressFrame, moments: KeyMoments | null) => void,
): PoseAnalysis {
  const [analysis, setAnalysis] = useState<PoseAnalysis>({ status: "analyzing", progress: 0 });

  // Always call the latest onReady without restarting the analysis.
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
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
      const coarse = await analyzeVideo(videoUrl, {
        signal: controller.signal,
        onProgress: (p) => progress(p * FIRST_PASS),
      });
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
        const start = Math.max(0, address.time - 0.1);
        const end = Math.min(rough.impact + 0.4, start + MAX_DETAIL_SECONDS);
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
      //    takeaway started.
      if (moments) {
        const settled = nearestFrame(track, takeawayTime(track, moments) - ADDRESS_LEAD);
        if (settled?.landmarks && settled.time < address.time - 0.01) {
          address = { index: track.frames.indexOf(settled), time: settled.time, landmarks: settled.landmarks };
          moments = { ...moments, address: settled.time };
        }
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
