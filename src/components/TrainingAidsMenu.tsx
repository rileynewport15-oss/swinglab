"use client";

import { PRESETS } from "@/lib/presets";
import type { DrawingApi } from "@/hooks/useDrawing";

type Props = { drawing: DrawingApi };

// Buttons that start placing a training aid. The user then clicks the video
// where it should go (instructions appear on top of the video).
export default function TrainingAidsMenu({ drawing }: Props) {
  const { placing, startPlacing, cancelPlacing } = drawing;

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-bold text-fairway-900">Place aids by hand</h2>
        <p className="text-xs text-fairway-700">
          Choose one, then click the video to place it. Drag the dots, the line, or the label to adjust.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => {
          const active = placing?.preset.id === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => (active ? cancelPlacing() : startPlacing(preset))}
              aria-pressed={active}
              className={`flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-xl px-3 py-2 text-left ${
                active
                  ? "bg-fairway-700 text-white"
                  : "bg-fairway-50 text-fairway-900 hover:bg-fairway-100"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-full ring-1 ring-fairway-900/30"
                  style={{ backgroundColor: preset.color }}
                />
                {preset.name}
              </span>
              <span className={`text-xs leading-tight ${active ? "text-white/80" : "text-fairway-700"}`}>
                {active ? "Click the video… (click again to cancel)" : preset.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
