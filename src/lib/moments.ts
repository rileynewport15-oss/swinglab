import type { ShotMode } from "@/config/analysisConfig";
import type { KeyMoments } from "./analysis/keyMoments";
import type { PuttMoments } from "./putting/moments";

// The key moments marked on the scrubber, per mode. Full swings: Address,
// Top, Impact. Putts: Setup, End of backstroke, Impact, Finish.

export type Moments = KeyMoments | PuttMoments;

export type MomentSpec = { id: string; label: string; short: string; color: string };

export const MOMENT_SPECS: Record<ShotMode, MomentSpec[]> = {
  "full-swing": [
    { id: "address", label: "Address", short: "A", color: "#0ea5e9" },
    { id: "top", label: "Top", short: "T", color: "#f59e0b" },
    { id: "impact", label: "Impact", short: "I", color: "#ef4444" },
  ],
  putt: [
    { id: "setup", label: "Setup", short: "S", color: "#0ea5e9" },
    { id: "backstroke", label: "End of backstroke", short: "B", color: "#f59e0b" },
    { id: "impact", label: "Impact", short: "I", color: "#ef4444" },
    { id: "finish", label: "Finish", short: "F", color: "#a855f7" },
  ],
};

/** A moment's time (NaN if it wasn't found). */
export function momentTime(moments: Moments | null, id: string): number {
  const t = moments ? (moments as Record<string, number>)[id] : undefined;
  return typeof t === "number" ? t : NaN;
}

/** Were all of this mode's moments found? */
export function allFound(moments: Moments | null, mode: ShotMode): boolean {
  return moments !== null && MOMENT_SPECS[mode].every((m) => Number.isFinite(momentTime(moments, m.id)));
}
