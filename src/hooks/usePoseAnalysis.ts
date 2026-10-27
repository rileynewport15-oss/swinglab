"use client";

import { useEffect, useRef, useState } from "react";
import { analyzeVideo } from "@/lib/pose/analyze";
import { checkQuality, findAddress, type AddressFrame, type QualityProblem } from "@/lib/pose/address";
import type { PoseTrack } from "@/lib/pose/landmarks";

export type PoseAnalysis =
  | { status: "analyzing"; progress: number } // progress 0–1 (0 while the model loads)
  | { status: "ready"; track: PoseTrack; address: AddressFrame }
  | { status: "failed"; problem: QualityProblem | "error"; track?: PoseTrack };

/**
 * Runs pose detection when a video is loaded. `onReady` is called once with
 * the address frame so the caller can place the aids.
 */
export function usePoseAnalysis(
  videoUrl: string,
  onReady: (track: PoseTrack, address: AddressFrame) => void,
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

    analyzeVideo(videoUrl, {
      signal: controller.signal,
      onProgress: (p) => {
        // Re-render at most every 2% to keep things smooth.
        if (p - lastShown >= 0.02 || p === 1) {
          lastShown = p;
          setAnalysis({ status: "analyzing", progress: p });
        }
      },
    })
      .then((track) => {
        const address = findAddress(track);
        const problem = checkQuality(track, address);
        if (problem || !address) {
          setAnalysis({ status: "failed", problem: problem ?? "not-found", track });
          return;
        }
        setAnalysis({ status: "ready", track, address });
        onReadyRef.current(track, address);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("Pose analysis failed", err);
        setAnalysis({ status: "failed", problem: "error" });
      });

    return () => controller.abort();
  }, [videoUrl]);

  return analysis;
}
