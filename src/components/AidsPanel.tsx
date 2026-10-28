"use client";

import {
  AIDS_FOR_ANGLE,
  AID_COLORS,
  AID_NAMES,
  TIMING_NAMES,
  type AidKey,
  type AidSettings,
  type AidTiming,
} from "@/lib/aidVisibility";
import type { CameraAngle } from "@/lib/pose/autoAids";

type Props = {
  settings: AidSettings;
  // Takes an update function so quick repeated taps always build on the latest settings.
  onChange: (update: (prev: AidSettings) => AidSettings) => void;
  cameraAngle: CameraAngle;
  skeletonAvailable: boolean; // only once pose analysis has finished
  timingAvailable: boolean; // only when Address/Top/Impact were found
};

// Card in the right column: which training aids show on the video, and when.
export default function AidsPanel({ settings, onChange, cameraAngle, skeletonAvailable, timingAvailable }: Props) {
  const aids = AIDS_FOR_ANGLE[cameraAngle].filter((a) => a !== "skeleton" || skeletonAvailable);

  const setAll = (on: boolean) =>
    onChange((prev) => ({ ...prev, visible: { ...prev.visible, ...Object.fromEntries(aids.map((a) => [a, on])) } }));
  const toggleVisible = (aid: AidKey) =>
    onChange((prev) => ({ ...prev, visible: { ...prev.visible, [aid]: !prev.visible[aid] } }));
  const setTiming = (aid: AidKey, timing: AidTiming) =>
    onChange((prev) => ({ ...prev, timing: { ...prev.timing, [aid]: timing } }));

  return (
    <section aria-label="Training aids" className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-bold text-fairway-900">Training aids</h2>
        <p className="text-xs text-fairway-700">
          {timingAvailable
            ? "Choose which aids show and when, using the A / T / I markers."
            : "Choose which aids show. Timing options work once Address, Top and Impact are found."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setAll(true)}
          className="min-h-10 rounded-xl bg-fairway-50 px-3 text-sm font-semibold text-fairway-800 hover:bg-fairway-100"
        >
          Show all
        </button>
        <button
          onClick={() => setAll(false)}
          className="min-h-10 rounded-xl bg-fairway-50 px-3 text-sm font-semibold text-fairway-800 hover:bg-fairway-100"
        >
          Hide all
        </button>
        <label className="ml-auto flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold text-fairway-900">
          Labels
          <Toggle
            checked={settings.labels}
            onToggle={() => onChange((prev) => ({ ...prev, labels: !prev.labels }))}
            label="Show labels"
          />
        </label>
      </div>

      <ul className="flex flex-col divide-y divide-fairway-100">
        {aids.map((aid) => (
          <li key={aid} className="flex min-h-12 items-center gap-2 py-1.5">
            <span
              aria-hidden
              className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-fairway-900/30"
              style={{ backgroundColor: AID_COLORS[aid] }}
            />
            <span className="min-w-0 flex-1 text-sm font-semibold leading-tight text-fairway-900">{AID_NAMES[aid]}</span>
            <select
              aria-label={`When to show the ${AID_NAMES[aid].toLowerCase()}`}
              value={settings.timing[aid]}
              disabled={!settings.visible[aid] || !timingAvailable}
              onChange={(e) => setTiming(aid, e.target.value as AidTiming)}
              className="min-h-9 w-28 shrink-0 rounded-lg sm:w-32 border border-fairway-200 bg-white px-1.5 text-xs text-fairway-900 disabled:opacity-40"
            >
              {(Object.keys(TIMING_NAMES) as AidTiming[]).map((t) => (
                <option key={t} value={t}>
                  {TIMING_NAMES[t]}
                </option>
              ))}
            </select>
            <Toggle checked={settings.visible[aid]} onToggle={() => toggleVisible(aid)} label={`Show ${AID_NAMES[aid]}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// An on/off switch. The button is 44px tall so it's easy to tap; the
// visible track inside it is smaller.
function Toggle({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className="flex h-11 w-14 shrink-0 items-center justify-center"
    >
      <span className={`relative h-7 w-12 rounded-full transition-colors ${checked ? "bg-fairway-600" : "bg-fairway-200"}`}>
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
