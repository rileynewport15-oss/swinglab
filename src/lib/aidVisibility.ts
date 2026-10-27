import type { AidKind } from "./shapes";
import type { CameraAngle } from "./pose/autoAids";
import type { KeyMoments } from "./analysis/keyMoments";

// Which training aids show on the video, and during which part of the swing.

export type AidKey = AidKind | "skeleton";
export type AidTiming = "whole" | "address" | "address-top" | "top-impact";

export const AID_NAMES: Record<AidKey, string> = {
  head: "Head circle",
  spine: "Spine angle",
  plane: "Plane line",
  stance: "Alignment",
  hips: "Hip box",
  skeleton: "Pose skeleton",
};

export const TIMING_NAMES: Record<AidTiming, string> = {
  whole: "Whole swing",
  address: "Address only",
  "address-top": "Address to top",
  "top-impact": "Top to impact",
};

/** The aids that make sense for each camera angle. */
export const AIDS_FOR_ANGLE: Record<CameraAngle, AidKey[]> = {
  "face-on": ["head", "spine", "stance", "hips", "skeleton"],
  "down-the-line": ["head", "spine", "plane", "skeleton"],
};

export type AidSettings = {
  visible: Record<AidKey, boolean>;
  timing: Record<AidKey, AidTiming>;
  labels: boolean;
};

export const DEFAULT_AID_SETTINGS: AidSettings = {
  visible: { head: true, spine: true, plane: true, stance: true, hips: true, skeleton: false },
  timing: { head: "whole", spine: "whole", plane: "whole", stance: "whole", hips: "whole", skeleton: "whole" },
  labels: true,
};

// A frame either side of a marker still counts as "at" it.
const TOLERANCE = 0.02;

/** Should this aid be on screen at this moment of the video? */
export function aidShownAt(key: AidKey, time: number, settings: AidSettings, moments: KeyMoments | null): boolean {
  if (!settings.visible[key]) return false;
  const timing = settings.timing[key];
  if (timing === "whole") return true;
  // Without detected markers we can't time anything, so show it throughout.
  if (!moments || !Number.isFinite(moments.top) || !Number.isFinite(moments.impact)) return true;
  switch (timing) {
    case "address":
      return time <= moments.address + TOLERANCE;
    case "address-top":
      return time >= moments.address - TOLERANCE && time <= moments.top + TOLERANCE;
    case "top-impact":
      return time >= moments.top - TOLERANCE && time <= moments.impact + TOLERANCE;
  }
}
