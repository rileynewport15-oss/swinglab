"use client";

import {
  AIDS_FOR_ANGLE,
  AID_NAMES,
  TIMING_NAMES,
  type AidKey,
  type AidSettings,
  type AidTiming,
} from "@/lib/aidVisibility";
import type { CameraAngle } from "@/lib/pose/autoAids";

type Props = {
  settings: AidSettings;
  onChange: (settings: AidSettings) => void;
  cameraAngle: CameraAngle;
  skeletonAvailable: boolean; // only once pose analysis has finished
  timingAvailable: boolean; // only when Address/Top/Impact were found
  onClose: () => void;
};

// Pop-up over the video: which aids show, and when.
export default function AidsPanel({ settings, onChange, cameraAngle, skeletonAvailable, timingAvailable, onClose }: Props) {
  const aids = AIDS_FOR_ANGLE[cameraAngle].filter((a) => a !== "skeleton" || skeletonAvailable);

  const setAll = (on: boolean) =>
    onChange({ ...settings, visible: { ...settings.visible, ...Object.fromEntries(aids.map((a) => [a, on])) } });
  const setVisible = (aid: AidKey, on: boolean) =>
    onChange({ ...settings, visible: { ...settings.visible, [aid]: on } });
  const setTiming = (aid: AidKey, timing: AidTiming) =>
    onChange({ ...settings, timing: { ...settings.timing, [aid]: timing } });

  return (
    <div
      role="dialog"
      aria-label="Training aids"
      className="absolute right-2 top-14 z-10 flex max-h-[calc(100%-4rem)] w-[min(20rem,calc(100%-1rem))] flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-3 text-fairway-900 shadow-xl"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">Training aids</h2>
        <button onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-full text-lg hover:bg-fairway-50">
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setAll(true)} className="min-h-10 rounded-xl bg-fairway-50 text-sm font-semibold hover:bg-fairway-100">
          Show all
        </button>
        <button onClick={() => setAll(false)} className="min-h-10 rounded-xl bg-fairway-50 text-sm font-semibold hover:bg-fairway-100">
          Hide all
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {aids.map((aid) => (
          <li key={aid} className="rounded-xl bg-fairway-50 p-2">
            <label className="flex min-h-9 cursor-pointer items-center justify-between gap-2">
              <span className="text-sm font-semibold">{AID_NAMES[aid]}</span>
              <input
                type="checkbox"
                role="switch"
                checked={settings.visible[aid]}
                onChange={(e) => setVisible(aid, e.target.checked)}
                className="h-5 w-5 accent-fairway-600"
              />
            </label>
            <select
              aria-label={`When to show the ${AID_NAMES[aid].toLowerCase()}`}
              value={settings.timing[aid]}
              disabled={!settings.visible[aid]}
              onChange={(e) => setTiming(aid, e.target.value as AidTiming)}
              className="mt-1 min-h-9 w-full rounded-lg border border-fairway-200 bg-white px-2 text-sm disabled:opacity-50"
            >
              {(Object.keys(TIMING_NAMES) as AidTiming[]).map((t) => (
                <option key={t} value={t}>
                  {TIMING_NAMES[t]}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>

      {!timingAvailable && (
        <p className="text-xs text-fairway-700">
          Timing choices need the Address, Top and Impact markers. Until they&apos;re found, aids show for the whole video.
        </p>
      )}

      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-xl border border-fairway-200 px-2">
        <span className="text-sm font-semibold">Labels</span>
        <input
          type="checkbox"
          role="switch"
          checked={settings.labels}
          onChange={(e) => onChange({ ...settings, labels: e.target.checked })}
          className="h-5 w-5 accent-fairway-600"
        />
      </label>
    </div>
  );
}
