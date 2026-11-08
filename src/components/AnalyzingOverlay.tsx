"use client";

import type { ShotMode } from "@/config/analysisConfig";

type Props = {
  mode: ShotMode;
  progress: number; // 0–1
};

// Covers the video while pose detection runs. (The camera angle is detected
// from the video afterwards, so there's nothing to ask here.)
export default function AnalyzingOverlay({ mode, progress }: Props) {
  const percent = Math.round(progress * 100);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-fairway-900/75 p-4 text-center text-white backdrop-blur-sm">
      <div className="w-full max-w-60">
        <p className="font-semibold" role="status">
          {progress === 0 ? "Loading pose detection…" : `Analyzing your ${mode === "putt" ? "putt" : "swing"}… ${percent}%`}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-fairway-200 transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}
