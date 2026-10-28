"use client";

import { useRef } from "react";

export type Marker = { id: string; label: string; short: string; time: number; color: string };

// The scrubber's thumb is 28px wide, so its track starts and ends 14px in.
// Ticks use the same inset so they line up with the scrubber.
const INSET = 14;

type TickProps = {
  duration: number;
  markers: Marker[];
  // Called while dragging (done = false) and once when released (done = true).
  onMove: (id: string, time: number, done: boolean) => void;
};

/**
 * Colored ticks drawn on the scrubber track at each key moment. Drag one left
 * or right if it's slightly off. Place inside a `relative` box around the
 * scrubber.
 */
export function MomentTicks({ duration, markers, onMove }: TickProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; startX: number; moved: boolean } | null>(null);

  function timeAt(clientX: number) {
    const rect = rowRef.current!.getBoundingClientRect();
    const fraction = (clientX - rect.left - INSET) / (rect.width - INSET * 2);
    return Math.min(Math.max(fraction, 0), 1) * duration;
  }

  if (!duration) return null;

  return (
    <div ref={rowRef} className="pointer-events-none absolute inset-0 touch-none select-none">
      {markers.map((m) => (
        <button
          key={m.id}
          title={`${m.label} (${m.time.toFixed(2)}s). Drag to adjust`}
          aria-label={`${m.label} marker at ${m.time.toFixed(2)} seconds, drag to adjust`}
          className="pointer-events-auto absolute top-1/2 flex h-8 w-4 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center"
          style={{ left: `calc(${INSET}px + (100% - ${INSET * 2}px) * ${m.time / duration})` }}
          onPointerDown={(e) => {
            e.preventDefault();
            try {
              e.currentTarget.setPointerCapture(e.pointerId); // keep receiving moves outside the tick
            } catch {
              // Some browsers refuse capture for synthetic events; dragging still works.
            }
            drag.current = { id: m.id, startX: e.clientX, moved: false };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== m.id) return;
            if (!d.moved && Math.abs(e.clientX - d.startX) < 3) return;
            d.moved = true;
            onMove(m.id, timeAt(e.clientX), false);
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            drag.current = null;
            // A tap without dragging jumps to the marker.
            onMove(m.id, d?.moved ? timeAt(e.clientX) : m.time, true);
          }}
        >
          <span className="h-5 w-1.5 rounded-full ring-2 ring-white" style={{ backgroundColor: m.color }} />
        </button>
      ))}
    </div>
  );
}

type ChipProps = {
  markers: Marker[];
  onSeek: (time: number) => void;
  onNudge: (id: string, seconds: number) => void; // move a marker by one frame
};

/**
 * Readable buttons for each key moment (they never overlap). Click to jump
 * there; ‹ › nudge the marker one frame, which is easier than dragging a tick
 * on a small screen.
 */
export function MomentChips({ markers, onSeek, onNudge }: ChipProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Key moments">
      {markers.map((m) => (
        <div key={m.id} className="flex items-center rounded-full bg-fairway-50">
          <NudgeButton label={`Move ${m.label} one frame earlier`} onClick={() => onNudge(m.id, -FRAME)}>
            ‹
          </NudgeButton>
          <button
            onClick={() => onSeek(m.time)}
            aria-label={`Jump to ${m.label} at ${m.time.toFixed(2)} seconds`}
            className="flex min-h-11 items-center gap-1.5 px-1 text-xs font-semibold text-fairway-900 hover:underline"
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: m.color }}
            >
              {m.short}
            </span>
            <span className="hidden sm:inline">{m.label}</span>
            <span className="tabular-nums text-fairway-700">{m.time.toFixed(2)}s</span>
          </button>
          <NudgeButton label={`Move ${m.label} one frame later`} onClick={() => onNudge(m.id, FRAME)}>
            ›
          </NudgeButton>
        </div>
      ))}
    </div>
  );
}

const FRAME = 1 / 30;

function NudgeButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-11 w-9 items-center justify-center rounded-full text-lg font-bold text-fairway-700 hover:bg-fairway-100"
    >
      {children}
    </button>
  );
}
