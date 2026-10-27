"use client";

import type { ShotMode } from "@/config/analysisConfig";

export type Mode = ShotMode;

export const MODES: { id: Mode; label: string; icon: string }[] = [
  { id: "full-swing", label: "Full Swing", icon: "🏌️" },
  { id: "chip", label: "Chip", icon: "⛳" },
  { id: "putt", label: "Putt", icon: "🕳️" },
];

type Props = {
  mode: Mode;
  onChange: (mode: Mode) => void;
};

// Segmented control at the top of the page. Later phases will use the mode
// to pick which analysis to run.
export default function ModeSelector({ mode, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Shot type"
      className="grid grid-cols-3 gap-1 rounded-2xl bg-fairway-900/40 p-1"
    >
      {MODES.map((m) => {
        const active = m.id === mode;
        return (
          <button
            key={m.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m.id)}
            className={`min-h-12 rounded-xl px-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-white text-fairway-800 shadow"
                : "text-white/90 active:bg-white/10"
            }`}
          >
            <span aria-hidden className="mr-1">
              {m.icon}
            </span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
