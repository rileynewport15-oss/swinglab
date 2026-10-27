"use client";

import { useRef } from "react";

export type Marker = { id: string; label: string; short: string; time: number; color: string };

type Props = {
  duration: number;
  markers: Marker[];
  onSeek: (time: number) => void;
  // Called while dragging (done = false) and once when released (done = true).
  onMove: (id: string, time: number, done: boolean) => void;
};

// The scrubber's thumb is 28px wide, so its track starts and ends 14px in.
// Markers use the same inset so they line up with the scrubber.
const INSET = 14;

// Address / Top / Impact markers above the scrubber. Click one to jump to
// that moment; drag it left or right if it's slightly off.
export default function MomentMarkers({ duration, markers, onSeek, onMove }: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; startX: number; moved: boolean } | null>(null);

  function timeAt(clientX: number) {
    const rect = rowRef.current!.getBoundingClientRect();
    const fraction = (clientX - rect.left - INSET) / (rect.width - INSET * 2);
    return Math.min(Math.max(fraction, 0), 1) * duration;
  }

  if (!duration) return null;

  return (
    <div ref={rowRef} className="relative mb-1 h-9 touch-none select-none">
      {markers.map((m) => (
        <button
          key={m.id}
          title={`${m.label} (${m.time.toFixed(2)}s). Click to jump, drag to adjust`}
          aria-label={`${m.label} at ${m.time.toFixed(2)} seconds`}
          className="absolute bottom-0 flex -translate-x-1/2 cursor-ew-resize flex-col items-center"
          style={{ left: `calc(${INSET}px + (100% - ${INSET * 2}px) * ${m.time / duration})` }}
          onPointerDown={(e) => {
            e.preventDefault();
            try {
              e.currentTarget.setPointerCapture(e.pointerId); // keep receiving moves outside the marker
            } catch {
              // Some browsers refuse capture for synthetic events; dragging still works.
            }
            drag.current = { id: m.id, startX: e.clientX, moved: false };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== m.id) return;
            if (!d.moved && Math.abs(e.clientX - d.startX) < 4) return;
            d.moved = true;
            onMove(m.id, timeAt(e.clientX), false);
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            drag.current = null;
            if (!d) return;
            if (d.moved) onMove(m.id, timeAt(e.clientX), true);
            else onSeek(m.time);
          }}
        >
          <span
            className="flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white shadow ring-2 ring-white"
            style={{ backgroundColor: m.color }}
          >
            {m.short}
          </span>
          <span className="h-1.5 w-0.5" style={{ backgroundColor: m.color }} />
        </button>
      ))}
    </div>
  );
}
