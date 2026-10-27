import { newId, type Point, type Shape, type Size } from "./shapes";

// Ready-made training aids. Each one is placed by clicking or tapping the
// video: `steps` are the prompts shown for each click, and `build` turns
// those clicked points into a shape.

export type PresetId = "swing-plane" | "alignment" | "head" | "spine";

export type Preset = {
  id: PresetId;
  name: string;
  description: string;
  color: string;
  steps: string[];
  build: (points: Point[], size: Size) => Omit<Shape, "id">;
};

export const PRESETS: Preset[] = [
  {
    id: "swing-plane",
    name: "Swing plane",
    description: "Ball, then hands. Extends up past the hands",
    color: "#facc15",
    steps: ["Click the golf ball", "Click your hands"],
    build: ([ball, hands]) => ({
      kind: "line",
      color: "#facc15",
      label: "Plane",
      // A plane line runs from the ball up through the hands and beyond,
      // so extend it 60% past the hands.
      points: [ball, { x: hands.x + (hands.x - ball.x) * 0.6, y: hands.y + (hands.y - ball.y) * 0.6 }],
    }),
  },
  {
    id: "alignment",
    name: "Alignment",
    description: "Along your toe line toward the target",
    color: "#ffffff",
    steps: ["Click one end of the line", "Click the other end (toward the target)"],
    build: (points) => ({ kind: "line", color: "#ffffff", label: "Alignment", points }),
  },
  {
    id: "head",
    name: "Head circle",
    description: "Click your head to spot sway or dipping",
    color: "#38bdf8",
    steps: ["Click the center of your head"],
    build: ([center], size) => {
      // Start with a radius of 4% of the video height (about head-sized for a
      // full-body shot), then the user can resize it with the edge handle.
      const radiusPx = size.height * 0.04;
      return {
        kind: "circle",
        color: "#38bdf8",
        label: "Head",
        points: [center, { x: center.x + radiusPx / size.width, y: center.y }],
      };
    },
  },
  {
    id: "spine",
    name: "Spine angle",
    description: "Hips, then base of neck. Shows the tilt",
    color: "#f472b6",
    steps: ["Click your hips (tailbone)", "Click the base of your neck"],
    build: (points) => ({ kind: "line", color: "#f472b6", label: "Spine", showTilt: true, points }),
  },
];

/** Make a training-aid shape from the points the user clicked. */
export function createPresetShape(preset: Preset, points: Point[], size: Size): Shape {
  return { ...preset.build(points, size), id: newId() };
}
