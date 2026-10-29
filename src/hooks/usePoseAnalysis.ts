"use client";

import { useEffect, useRef, useState } from "react";
import { analyzeVideo, mergeDetail } from "@/lib/pose/analyze";
import { checkQuality, findAddress, type AddressFrame, type QualityProblem } from "@/lib/pose/address";
import { ADDRESS_LEAD, detectKeyMoments, takeawayTime, type KeyMoments } from "@/lib/analysis/keyMoments";
import { nearestFrame, type PoseTrack, type Px } from "@/lib/pose/landmarks";
import type { ShotMode } from "@/config/analysisConfig";
import { beforeCameraMove } from "@/lib/pose/cameraMotion";
import { detectPuttMoments, type PuttMoments } from "@/lib/putting/moments";
import { detectView } from "@/lib/putting/stroke";
import { findBall } from "@/lib/putting/ball";
import type { Moments } from "@/lib/moments";

export type PoseAnalysis =
  | { status: "analyzing"; progress: number } // progress 0–1 (0 while the model loads)
  // `address` is the setup position for putts; `ball` is only looked for in
  // putts filmed down the line.
  | { status: "ready"; track: PoseTrack; address: AddressFrame; moments: Moments | null; ball: Px | null }
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
// Putts: the whole-video pass runs at up to this rate (the stroke is small
// and down the line barely moves the hands, so 15 per second can miss it),
// and if the stroke still isn't found, the close look covers this many
// seconds after the setup position.
const PUTT_FIRST_PASS_FPS = 30;
const PUTT_SEARCH_SECONDS = 3;

/**
 * Runs pose detection when a video is loaded (and again if the mode
 * changes: putts and full swings look for different moments). `onReady` is
 * called once with the results so the caller can place the aids.
 */
export function usePoseAnalysis(
  videoUrl: string,
  mode: ShotMode,
  onReady: (track: PoseTrack, address: AddressFrame, moments: Moments | null, ball: Px | null) => void,
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
      // If the camera moves (e.g. pans to follow the ball), only use the part before it.
      const coarse = beforeCameraMove(
        await analyzeVideo(videoUrl, {
          signal: controller.signal,
          maxFps: mode === "putt" ? PUTT_FIRST_PASS_FPS : undefined,
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

      const detailPass = (start: number, end: number) =>
        analyzeVideo(videoUrl, {
          signal: controller.signal,
          start,
          end,
          fps: DETAIL_FPS,
          onProgress: (p) => progress(FIRST_PASS + p * (1 - FIRST_PASS)),
        });

      if (mode === "putt") {
        // 2. Putts: the rough stroke, then a close look at it (or at the
        //    seconds after setup if the quick pass couldn't time it).
        const rough = detectPuttMoments(coarse);
        const start = Math.max(0, (rough?.setup ?? address.time) - DETAIL_BEFORE_ADDRESS);
        const end = Math.min(rough ? rough.finish + 0.4 : address.time + PUTT_SEARCH_SECONDS, start + MAX_DETAIL_SECONDS, lastTime);
        const track = end > start ? mergeDetail(coarse, await detailPass(start, end)) : coarse;
        const moments: PuttMoments | null = detectPuttMoments(track) ?? rough;
        const setup = moments ? nearestFrame(track, moments.setup) : null;
        if (setup?.landmarks) {
          address = { index: track.frames.indexOf(setup), time: setup.time, landmarks: setup.landmarks };
        }
        // Down the line, find the ball for the eye line.
        const ball =
          detectView(track) === "down-the-line" ? await findBall(videoUrl, address.time, address.landmarks, track) : null;
        if (controller.signal.aborted) return;
        setAnalysis({ status: "ready", track, address, moments, ball });
        onReadyRef.current(track, address, moments, ball);
        return;
      }

      // 2. Rough top and impact, then a close look at that stretch.
      let track = coarse;
      const rough = detectKeyMoments(coarse, address.time);
      if (rough) {
        const start = Math.max(0, address.time - DETAIL_BEFORE_ADDRESS);
        const end = Math.min(rough.impact + 0.4, start + MAX_DETAIL_SECONDS, lastTime);
        track = mergeDetail(coarse, await detailPass(start, end));
      }

      // 3. Precise top and impact from the detailed frames.
      let moments: KeyMoments | null = detectKeyMoments(track, address.time);

      // 4. A slow takeaway can look like standing still. If the hands were
      //    already moving at "address", move address back to just before the
      //    takeaway started. Top and impact are measured from where the
      //    hands were at address, so find them again.
      if (moments) {
        const settled = nearestFrame(track, takeawayTime(track, moments) - ADDRESS_LEAD);
        if (settled?.landmarks && settled.time < address.time - 0.01) {
          address = { index: track.frames.indexOf(settled), time: settled.time, landmarks: settled.landmarks };
          moments = detectKeyMoments(track, settled.time) ?? { ...moments, address: settled.time };
        }
      }

      setAnalysis({ status: "ready", track, address, moments, ball: null });
      onReadyRef.current(track, address, moments, null);
    })().catch((err) => {
      if (controller.signal.aborted) return;
      console.error("Pose analysis failed", err);
      setAnalysis({ status: "failed", problem: "error" });
    });

    return () => controller.abort();
  }, [videoUrl, mode]);

  return analysis;
}
