"use client";

import { PRESETS, createPresetShape } from "@/lib/presets";
import type { DrawingApi } from "@/hooks/useDrawing";

type Props = { drawing: DrawingApi };

// Buttons that drop a preset training aid onto the video.
export default function TrainingAidsMenu({ drawing }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-bold text-fairway-900">Training aids</h2>
        <p className="text-xs text-fairway-700">
          Tap to add, then drag it or its white dots into place.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => drawing.addAndSelect(createPresetShape(preset))}
            className="flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-xl bg-fairway-50 px-3 py-2 text-left active:bg-fairway-100"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-fairway-900">
              <span
                aria-hidden
                className="h-3 w-3 rounded-full ring-1 ring-fairway-900/30"
                style={{ backgroundColor: preset.shape.color }}
              />
              {preset.name}
            </span>
            <span className="text-xs leading-tight text-fairway-700">
              {preset.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
