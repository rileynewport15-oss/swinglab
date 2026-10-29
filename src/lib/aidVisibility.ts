import type { AidKind } from "./shapes";
import type { CameraAngle } from "./pose/autoAids";
import type { ShotMode } from "@/config/analysisConfig";
import { momentTime, type Moments } from "./moments";

// Which training aids show on the video, and during which part of the swing or stroke.

export type AidKey = AidKind | "skeleton";
// Full swing timings, then putting timings (see TIMINGS).
export type AidTiming = "whole" | "address" | "address-top" | "top-impact" | "setup" | "backstroke" | "forward";

export const AID_NAMES: Record<AidKey, string> = {
  head: "Head circle",
  spine: "Spine angle",
  plane: "Plane line",
  stance: "Alignment",
  hips: "Hip box",
  puttHead: "Head box",
  lowerBody: "Lower body box",
  shoulders: "Shoulder line",
  triangle: "Pendulum triangle",
  strokeLength: "Stroke length",
  handPath: "Hand path",
  eyeLine: "Eye line",
  skeleton: "Pose skeleton",
};

// Matches the colors the aids are drawn in (see autoAids.ts and putting/aids.ts).
export const AID_COLORS: Record<AidKey, string> = {
  head: "#38bdf8",
  spine: "#f472b6",
  plane: "#facc15",
  stance: "#ffffff",
  hips: "#fb923c",
  puttHead: "#38bdf8",
  lowerBody: "#fb923c",
  shoulders: "#f472b6",
  triangle: "#a3e635",
  strokeLength: "#ffffff",
  handPath: "#facc15",
  eyeLine: "#c084fc",
  skeleton: "#22c55e",
};

/** Every aid kind (the skeleton isn't a shape, so it's not in here). */
export const ALL_AID_KINDS: AidKind[] = [
  "head",
  "spine",
  "stance",
  "hips",
  "plane",
  "puttHead",
  "lowerBody",
  "shoulders",
  "triangle",
  "strokeLength",
  "handPath",
  "eyeLine",
];

/**
 * The aids that make sense for each mode and camera angle. Putting down the
 * line, the shoulders overlap and the stroke goes toward the camera, so the
 * shoulder line, triangle and stroke length are face on only; the eye line
 * is down the line only.
 */
export const AIDS_FOR: Record<ShotMode, Record<CameraAngle, AidKey[]>> = {
  "full-swing": {
    "face-on": ["head", "spine", "stance", "hips", "skeleton"],
    "down-the-line": ["head", "spine", "plane", "skeleton"],
  },
  putt: {
    "face-on": ["puttHead", "lowerBody", "shoulders", "triangle", "strokeLength", "handPath", "skeleton"],
    "down-the-line": ["puttHead", "lowerBody", "handPath", "eyeLine", "skeleton"],
  },
};

type TimingSpec = { id: AidTiming; name: string; from?: string; to?: string };

/** When an aid can be shown, per mode: between two key moments (by id). */
export const TIMINGS: Record<ShotMode, TimingSpec[]> = {
  "full-swing": [
    { id: "whole", name: "Whole swing" },
    { id: "address", name: "Address only", to: "address" },
    { id: "address-top", name: "Address to top", from: "address", to: "top" },
    { id: "top-impact", name: "Top to impact", from: "top", to: "impact" },
  ],
  putt: [
    { id: "whole", name: "Whole stroke" },
    { id: "setup", name: "Setup only", to: "setup" },
    { id: "backstroke", name: "Backstroke", from: "setup", to: "backstroke" },
    { id: "forward", name: "Forward stroke", from: "backstroke", to: "finish" },
  ],
};

export type AidSettings = {
  visible: Record<AidKey, boolean>;
  timing: Record<AidKey, AidTiming>;
  labels: boolean;
};

const ALL_KEYS: AidKey[] = [...ALL_AID_KINDS, "skeleton"];

export const DEFAULT_AID_SETTINGS: AidSettings = {
  visible: Object.fromEntries(ALL_KEYS.map((k) => [k, k !== "skeleton"])) as Record<AidKey, boolean>,
  timing: Object.fromEntries(ALL_KEYS.map((k) => [k, "whole"])) as Record<AidKey, AidTiming>,
  labels: true,
};

// A frame either side of a marker still counts as "at" it.
const TOLERANCE = 0.02;

/** Should this aid be on screen at this moment of the video? */
export function aidShownAt(
  key: AidKey,
  time: number,
  settings: AidSettings,
  moments: Moments | null,
  mode: ShotMode,
): boolean {
  if (!settings.visible[key]) return false;
  // A timing from the other mode (e.g. the skeleton set to "Address to top"
  // before switching to Putt) counts as the whole video.
  const spec = TIMINGS[mode].find((t) => t.id === settings.timing[key]);
  if (!spec || spec.id === "whole") return true;
  const from = spec.from ? momentTime(moments, spec.from) : -Infinity;
  const to = spec.to ? momentTime(moments, spec.to) : Infinity;
  // Without detected markers we can't time anything, so show it throughout.
  if (Number.isNaN(from) || Number.isNaN(to)) return true;
  return time >= from - TOLERANCE && time <= to + TOLERANCE;
}
