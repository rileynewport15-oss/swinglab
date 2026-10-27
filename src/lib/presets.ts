import { newId, type Shape } from "./shapes";

// Ready-made training aids. Positions are rough starting spots for a golfer
// standing in the middle of the frame (0–1 of video width/height). The user
// drags them into place afterward.

export type PresetId = "swing-plane" | "alignment" | "head" | "spine";

type Preset = {
  id: PresetId;
  name: string;
  description: string;
  shape: Omit<Shape, "id">;
};

export const PRESETS: Preset[] = [
  {
    id: "swing-plane",
    name: "Swing plane",
    description: "From the ball up through the hands or shoulders",
    shape: {
      kind: "line",
      color: "#facc15",
      label: "Plane",
      points: [
        { x: 0.68, y: 0.88 },
        { x: 0.32, y: 0.38 },
      ],
    },
  },
  {
    id: "alignment",
    name: "Alignment",
    description: "Along the toe line, pointing at the target",
    shape: {
      kind: "line",
      color: "#ffffff",
      label: "Alignment",
      points: [
        { x: 0.12, y: 0.9 },
        { x: 0.88, y: 0.9 },
      ],
    },
  },
  {
    id: "head",
    name: "Head circle",
    description: "Around the head to spot sway or dipping",
    shape: {
      kind: "circle",
      color: "#38bdf8",
      label: "Head",
      points: [
        { x: 0.5, y: 0.25 },
        { x: 0.57, y: 0.25 },
      ],
    },
  },
  {
    id: "spine",
    name: "Spine angle",
    description: "Hips to base of neck. Shows the tilt in degrees",
    shape: {
      kind: "line",
      color: "#f472b6",
      label: "Spine",
      showTilt: true,
      points: [
        { x: 0.52, y: 0.58 },
        { x: 0.42, y: 0.33 },
      ],
    },
  },
];

/** Make a new copy of a preset's shape to add to the drawing. */
export function createPresetShape(preset: Preset): Shape {
  return {
    ...preset.shape,
    id: newId(),
    points: preset.shape.points.map((p) => ({ ...p })),
  };
}
