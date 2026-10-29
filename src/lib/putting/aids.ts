import { newId, type Point, type Shape } from "../shapes";
import { LM, distance, headCenter, mid, px, torsoLength, type Landmark, type PoseTrack, type Px } from "../pose/landmarks";
import type { CameraAngle } from "../pose/autoAids";
import { strokeLengths } from "./metrics";
import type { PuttMoments } from "./moments";

// Colors match AID_COLORS in aidVisibility.ts.
export const PUTT_COLORS = {
  puttHead: "#38bdf8",
  lowerBody: "#fb923c",
  shoulders: "#f472b6",
  triangle: "#a3e635",
  strokeLength: "#ffffff",
  handPath: "#facc15",
  eyeLine: "#c084fc",
};

/**
 * The putting aids that stay fixed where they were placed at setup (the
 * shoulder line, pendulum triangle and hand path move with the golfer and
 * are drawn by PuttOverlay instead). Like the full swing aids, they can be
 * dragged to fine-tune them.
 */
export function buildPuttAids(
  lms: Landmark[],
  angle: CameraAngle,
  track: PoseTrack,
  moments: PuttMoments | null,
  ball: Px | null,
): Shape[] {
  const P = (i: number) => px(lms, i, track);
  const toVideo = (p: Px): Point => ({ x: p.x / track.width, y: p.y / track.height });
  const shape = (s: Omit<Shape, "id" | "auto">): Shape => ({ ...s, id: newId(), auto: true });
  const box = (a: Px, b: Px) => [toVideo(a), toVideo(b)];
  const torso = torsoLength(lms, track);
  const aids: Shape[] = [];

  // Head box: snug around the head, so any movement out of it shows.
  // From down the line the ears overlap, so use a head-sized share of the torso.
  const head = headCenter(lms, track);
  const halfWidth = Math.max(distance(P(LM.leftEar), P(LM.rightEar)) * 0.85, torso * 0.24);
  const halfHeight = halfWidth * 1.2;
  aids.push(
    shape({
      kind: "box",
      color: PUTT_COLORS.puttHead,
      label: "Head",
      aid: "puttHead",
      points: box(
        { x: head.x - halfWidth, y: head.y - halfHeight * 1.1 },
        { x: head.x + halfWidth, y: head.y + halfHeight * 0.9 },
      ),
    }),
  );

  // Lower body box: around the hips and knees, to show any sway.
  const lower = [LM.leftHip, LM.rightHip, LM.leftKnee, LM.rightKnee].map(P);
  const margin = torso * 0.18;
  aids.push(
    shape({
      kind: "box",
      color: PUTT_COLORS.lowerBody,
      label: "Lower body",
      aid: "lowerBody",
      points: box(
        { x: Math.min(...lower.map((p) => p.x)) - margin, y: Math.min(...lower.map((p) => p.y)) - margin * 0.5 },
        { x: Math.max(...lower.map((p) => p.x)) + margin, y: Math.max(...lower.map((p) => p.y)) + margin * 0.5 },
      ),
    }),
  );

  // Stroke length (face on): a ruler at shin height (clear of the other aids)
  // with ticks where the hands were at setup, at the end of the backstroke
  // and at the finish.
  if (angle === "face-on" && moments) {
    const lengths = strokeLengths(track, moments);
    if (lengths) {
      const knees = mid(P(LM.leftKnee), P(LM.rightKnee));
      const ankles = mid(P(LM.leftAnkle), P(LM.rightAnkle));
      const y = (knees.y + ankles.y) / 2;
      const half = torso * 0.07;
      const tick = (x: number, label?: string, scale = 1) =>
        shape({
          kind: "line",
          color: PUTT_COLORS.strokeLength,
          label,
          aid: "strokeLength",
          points: [toVideo({ x, y: y - half * scale }), toVideo({ x, y: y + half * scale })],
        });
      aids.push(
        shape({
          kind: "line",
          color: PUTT_COLORS.strokeLength,
          aid: "strokeLength",
          points: [toVideo({ x: lengths.backX, y }), toVideo({ x: lengths.throughX, y })],
        }),
        tick(lengths.setupX, undefined, 0.6),
        tick(lengths.backX, `Back ${inchesShort(lengths.backInches)}`),
        tick(lengths.throughX, `Through ${inchesShort(lengths.throughInches)}`),
      );
    }
  }

  // Eye line (down the line): straight down from the eyes, to see whether
  // they're over the ball. The ball gets a ring when it was found.
  if (angle === "down-the-line") {
    const eyes = mid(P(LM.leftEye), P(LM.rightEye));
    const ground = Math.max(P(LM.leftHeel).y, P(LM.rightHeel).y, P(LM.leftToe).y, P(LM.rightToe).y, ball?.y ?? 0);
    aids.push(
      shape({
        kind: "line",
        color: PUTT_COLORS.eyeLine,
        label: "Eye line",
        aid: "eyeLine",
        points: [toVideo(eyes), toVideo({ x: eyes.x, y: ground + torso * 0.08 })],
      }),
    );
    if (ball) {
      const r = (torso / 19) * 1.68;
      aids.push(
        shape({
          kind: "circle",
          color: PUTT_COLORS.eyeLine,
          label: "Ball",
          aid: "eyeLine",
          points: [toVideo(ball), toVideo({ x: ball.x + r, y: ball.y })],
        }),
      );
    }
  }

  return aids;
}

function inchesShort(value: number) {
  return `${Math.round(value * 2) / 2} in`;
}

