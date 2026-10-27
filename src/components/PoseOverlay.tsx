"use client";

import { useEffect, useRef, type RefObject } from "react";
import { drawSkeleton, poseAt } from "@/lib/pose/skeleton";
import type { PoseTrack } from "@/lib/pose/landmarks";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  track: PoseTrack;
};

// The live pose skeleton, drawn under the training aids. It follows the
// video (playing, scrubbing or frame stepping) while the aids stay fixed.
export default function PoseOverlay({ videoRef, track }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let frameId = 0;
    let lastTime = -1;
    let lastWidth = 0;
    let lastHeight = 0;

    // Check every animation frame, but only redraw when the time or size changed.
    const tick = () => {
      frameId = requestAnimationFrame(tick);
      const video = videoRef.current;
      if (!video) return;
      const { clientWidth: width, clientHeight: height } = canvas;
      if (video.currentTime === lastTime && width === lastWidth && height === lastHeight) return;
      lastTime = video.currentTime;
      lastWidth = width;
      lastHeight = height;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const pose = poseAt(track, video.currentTime);
      if (pose) drawSkeleton(ctx, pose, { width, height });
    };
    tick();
    return () => cancelAnimationFrame(frameId);
  }, [videoRef, track]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
