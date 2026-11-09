"use client";

import type { ShotMode } from "@/config/analysisConfig";
import { FIRST_PASS } from "@/hooks/usePoseAnalysis";

type Props = {
  mode: ShotMode;
  progress: number; // 0–1 (0 while the pose model loads)
};

// The progress bar is split between the analysis passes (see usePoseAnalysis):
// a quick pass over the whole video finds the body and roughly where the
// swing is, then a close look at the swing pins down the key moments, and the
// last stretch is the measuring. Each step is shown as it happens.
const MEASURE_FROM = 0.92;

// Covers the video while pose detection runs. (The camera angle is detected
// from the video afterwards, so there's nothing to ask here.)
export default function AnalyzingOverlay({ mode, progress }: Props) {
  const percent = Math.round(progress * 100);
  const shot = mode === "putt" ? "stroke" : "swing";
  const steps = [
    { label: "Finding your body position", from: 0 },
    { label: "Detecting key moments", from: FIRST_PASS },
    { label: `Measuring your ${shot}`, from: MEASURE_FROM },
  ];
  const current = progress === 0 ? -1 : steps.findLastIndex((s) => progress >= s.from);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-fairway-900/80 p-4 text-white backdrop-blur-sm">
      <div className="w-full max-w-64">
        <p className="text-center text-sm font-semibold lg:text-base" role="status" aria-live="polite">
          {current === -1 ? "Loading pose detection…" : `${steps[current].label}…`}
        </p>
        <div
          role="progressbar"
          aria-label={`Analyzing your ${shot}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20"
        >
          <div className="h-full rounded-full bg-fairway-200 transition-[width] duration-300" style={{ width: `${Math.max(percent, 3)}%` }} />
        </div>
        <ol className="mt-3 flex flex-col gap-1.5 text-xs lg:text-sm">
          {steps.map((s, i) => {
            const state = i < current ? "done" : i === current ? "now" : "next";
            return (
              <li key={s.label} className={`flex items-center gap-2 ${state === "next" ? "text-white/50" : "text-white"}`}>
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    state === "done" ? "bg-fairway-200 text-fairway-900" : state === "now" ? "animate-pulse bg-white text-fairway-900" : "border border-white/40"
                  }`}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                {s.label}
                <span className="sr-only">{state === "done" ? " (done)" : state === "now" ? " (in progress)" : ""}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-center text-xs text-white/70">{percent}%</p>
      </div>
    </div>
  );
}
