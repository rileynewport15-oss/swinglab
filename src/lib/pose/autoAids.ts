import { newId, type Point, type Shape } from "../shapes";
import { LM, distance, mid, px, torsoLength, type Landmark, type PoseTrack, type Px } from "./landmarks";

export type CameraAngle = "face-on" | "down-the-line";

export const CAMERA_ANGLES: { id: CameraAngle; label: string; aids: string }[] = [
  { id: "face-on", label: "Face On", aids: "Head, spine, stance line, hip lines" },
  { id: "down-the-line", label: "Down the Line", aids: "Head, spine, swing plane" },
];

const COLORS = {
  head: "#38bdf8",
  spine: "#f472b6",
  stance: "#ffffff",
  hips: "#fb923c",
  plane: "#facc15",
};

/**
 * Build the training aids from the golfer's address position. They stay
 * fixed while the video plays, so the user can see how far they move away
 * from their setup during the swing.
 */
export function buildAutoAids(lms: Landmark[], angle: CameraAngle, track: PoseTrack): Shape[] {
  // Work in video pixels so circles stay round and angles are true,
  // then convert back to video coordinates (0–1) for storage.
  const P = (i: number) => px(lms, i, track);
  const toVideo = (p: Px): Point => ({ x: p.x / track.width, y: p.y / track.height });
  const shape = (s: Omit<Shape, "id" | "auto">): Shape => ({ ...s, id: newId(), auto: true });

  const shoulders = mid(P(LM.leftShoulder), P(LM.rightShoulder));
  const hips = mid(P(LM.leftHip), P(LM.rightHip));
  const torso = torsoLength(lms, track);

  // Head circle: centered on the head using the nose and ears, sized from the
  // ear spacing with padding. From down the line the ears overlap, so never go
  // smaller than a head-sized fraction of the torso.
  const nose = P(LM.nose);
  const leftEar = P(LM.leftEar);
  const rightEar = P(LM.rightEar);
  const ears = mid(leftEar, rightEar);
  const radius = Math.max(distance(leftEar, rightEar) * 0.8, torso * 0.28);
  // The middle of the skull sits a little toward the face from the ears, and a little above them.
  const headCenter = {
    x: ears.x + (nose.x - ears.x) * 0.25,
    y: ears.y + (nose.y - ears.y) * 0.25 - radius * 0.15,
  };
  const aids: Shape[] = [
    shape({
      kind: "circle",
      color: COLORS.head,
      label: "Head",
      points: [toVideo(headCenter), toVideo({ x: headCenter.x + radius, y: headCenter.y })],
    }),
    // Spine angle: hip midpoint to shoulder midpoint, with the tilt shown.
    shape({
      kind: "line",
      color: COLORS.spine,
      label: "Spine",
      showTilt: true,
      points: [toVideo(hips), toVideo(shoulders)],
    }),
  ];

  if (angle === "face-on") {
    // Stance line through both feet (at ground level), extended past each foot.
    const foot = (heel: number, toe: number) => {
      const h = P(heel);
      const t = P(toe);
      return { x: (h.x + t.x) / 2, y: Math.max(h.y, t.y) };
    };
    const a = foot(LM.leftHeel, LM.leftToe);
    const b = foot(LM.rightHeel, LM.rightToe);
    aids.push(
      shape({
        kind: "line",
        color: COLORS.stance,
        label: "Stance",
        points: [toVideo(extend(b, a, 0.35)), toVideo(extend(a, b, 0.35))],
      }),
    );

    // Hip lines: vertical lines just outside each hip, to show sway.
    // Hip landmarks are joint centers, so push out to the edge of the body.
    const leftHip = P(LM.leftHip);
    const rightHip = P(LM.rightHip);
    const outward = distance(leftHip, rightHip) * 0.45;
    const top = hips.y - torso * 0.35;
    const bottom = hips.y + torso * 0.45;
    for (const [hip, other, label] of [
      [leftHip, rightHip, "Hip"],
      [rightHip, leftHip, undefined],
    ] as const) {
      const x = hip.x + Math.sign(hip.x - other.x || 1) * outward;
      aids.push(
        shape({
          kind: "line",
          color: COLORS.hips,
          label,
          points: [toVideo({ x, y: top }), toVideo({ x, y: bottom })],
        }),
      );
    }
  } else {
    // Swing plane: from an estimated ball position up through the hands,
    // extended past the shoulders.
    const hands = average([P(LM.leftWrist), P(LM.rightWrist), P(LM.leftIndex), P(LM.rightIndex)]);
    const toes = mid(P(LM.leftToe), P(LM.rightToe));
    const heels = mid(P(LM.leftHeel), P(LM.rightHeel));
    const feet = mid(toes, heels);
    // Leg length (hip → knee → ankle) is our ruler here: unlike overall height,
    // it doesn't shrink when the golfer bends over at address.
    const leg = (side: "left" | "right") => {
      const hip = P(side === "left" ? LM.leftHip : LM.rightHip);
      const knee = P(side === "left" ? LM.leftKnee : LM.rightKnee);
      const ankle = P(side === "left" ? LM.leftAnkle : LM.rightAnkle);
      return distance(hip, knee) + distance(knee, ankle);
    };
    const legLength = (leg("left") + leg("right")) / 2;
    // The golfer faces the side the hands hang toward; the ball sits out from
    // the toes on that side (about 0.75 leg lengths), at ground level.
    const facing = Math.sign(hands.x - hips.x) || 1;
    const ball = { x: toes.x + facing * legLength * 0.75, y: Math.max(toes.y, feet.y) };
    // Extend the ball→hands line until it rises a bit above shoulder height.
    const targetY = shoulders.y - torso * 0.3;
    const rise = ball.y - hands.y;
    const t = rise > 1 ? (ball.y - targetY) / rise : 2;
    const end = { x: ball.x + (hands.x - ball.x) * t, y: ball.y + (hands.y - ball.y) * t };
    aids.push(
      shape({
        kind: "line",
        color: COLORS.plane,
        label: "Plane",
        points: [toVideo(ball), toVideo(end)],
      }),
    );
  }

  return aids;
}

/** Point `amount` (fraction of the a→b length) beyond b, continuing from a. */
function extend(a: Px, b: Px, amount: number): Px {
  return { x: b.x + (b.x - a.x) * amount, y: b.y + (b.y - a.y) * amount };
}

function average(points: Px[]): Px {
  return {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  };
}
