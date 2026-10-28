"use client";

import TrainingAidsMenu from "./TrainingAidsMenu";
import { CAMERA_ANGLES, type CameraAngle } from "@/lib/pose/autoAids";
import type { PoseAnalysis } from "@/hooks/usePoseAnalysis";
import type { DrawingApi } from "@/hooks/useDrawing";

type Props = {
  analysis: PoseAnalysis;
  cameraAngle: CameraAngle;
  onChangeAngle: (angle: CameraAngle) => void;
  addressTime: number | null;
  onJumpToAddress: () => void;
  onResetAids: () => void;
  drawing: DrawingApi;
};

const PROBLEMS = {
  "not-found": "We couldn't find a golfer in this video.",
  "too-small": "You're too small in the frame for accurate aids.",
  unclear: "We couldn't see your body clearly enough.",
  error: "Something went wrong analyzing this video.",
};

const TIPS = [
  "Stand 3–4 big steps from the camera so your whole body, head to feet, fills most of the frame.",
  "Film in good, even light. Avoid shooting into the sun or in deep shade.",
  "Keep the camera still at about hip height (a tripod or your bag works).",
  "Face On: camera straight in front of your chest. Down the Line: behind your hands, pointing at the target.",
];

// Results of the pose analysis: camera angle, skeleton toggle, and the
// address frame — or friendly filming tips plus manual placement if it failed.
export default function AnalysisPanel(props: Props) {
  const { analysis, cameraAngle, onChangeAngle, addressTime, onJumpToAddress, onResetAids } = props;

  if (analysis.status === "failed") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-3xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm">
          <h2 className="font-bold text-amber-900">⛳ {PROBLEMS[analysis.problem]}</h2>
          <p className="text-sm text-amber-900">
            No worries. You can place the aids yourself below. For automatic aids next time:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
            {TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
        <TrainingAidsMenu drawing={props.drawing} />
      </div>
    );
  }

  const ready = analysis.status === "ready";
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-bold text-fairway-900">Swing analysis</h2>
        <p className="text-xs text-fairway-700">
          {ready
            ? "Aids are set at your address position and stay fixed while you swing. Drag them to fine-tune, or use the Training aids card to choose which show and when."
            : "Finding your address position…"}
        </p>
      </div>

      <div role="group" aria-label="Camera angle" className="grid grid-cols-2 gap-2">
        {CAMERA_ANGLES.map((a) => (
          <button
            key={a.id}
            onClick={() => onChangeAngle(a.id)}
            aria-pressed={cameraAngle === a.id}
            className={`min-h-12 rounded-xl text-sm font-semibold ${
              cameraAngle === a.id
                ? "bg-fairway-700 text-white"
                : "bg-fairway-50 text-fairway-800 hover:bg-fairway-100"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>


      {ready && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onJumpToAddress}
            className="min-h-12 rounded-xl bg-fairway-50 text-sm font-semibold text-fairway-800 hover:bg-fairway-100"
          >
            Go to address ({(addressTime ?? analysis.address.time).toFixed(2)}s)
          </button>
          <button
            onClick={onResetAids}
            className="min-h-12 rounded-xl bg-fairway-50 text-sm font-semibold text-fairway-800 hover:bg-fairway-100"
          >
            Reset aids
          </button>
        </div>
      )}
    </div>
  );
}
