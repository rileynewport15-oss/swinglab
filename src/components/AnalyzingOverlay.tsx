"use client";

import { CAMERA_ANGLES, type CameraAngle } from "@/lib/pose/autoAids";

type Props = {
  progress: number; // 0–1
  askAngle: boolean; // only the first time
  cameraAngle: CameraAngle;
  onChooseAngle: (angle: CameraAngle) => void;
};

// Covers the video while pose detection runs. The first time, it also asks
// for the camera angle so the user answers while they wait.
export default function AnalyzingOverlay({ progress, askAngle, cameraAngle, onChooseAngle }: Props) {
  const percent = Math.round(progress * 100);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-fairway-900/75 p-4 text-center text-white backdrop-blur-sm">
      <div className="w-full max-w-60">
        <p className="font-semibold" role="status">
          {progress === 0 ? "Loading pose detection…" : `Analyzing your swing… ${percent}%`}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-fairway-200 transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {askAngle && (
        <div className="w-full max-w-64 rounded-2xl bg-white p-3 text-fairway-900 shadow-lg">
          <p className="text-sm font-bold">Where was the camera?</p>
          <div className="mt-2 grid gap-2">
            {CAMERA_ANGLES.map((a) => (
              <button
                key={a.id}
                onClick={() => onChooseAngle(a.id)}
                aria-pressed={cameraAngle === a.id}
                className={`min-h-11 rounded-xl px-3 py-1.5 text-left text-sm ${
                  cameraAngle === a.id
                    ? "bg-fairway-700 text-white"
                    : "bg-fairway-50 text-fairway-900 hover:bg-fairway-100"
                }`}
              >
                <span className="font-semibold">{a.label}</span>
                <span className={`block text-xs ${cameraAngle === a.id ? "text-white/80" : "text-fairway-700"}`}>
                  {a.aids}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
