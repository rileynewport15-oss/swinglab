"use client";

import { useRef, useSyncExternalStore } from "react";

// True on touch devices (phones/tablets). On the server we assume false.
const coarsePointerQuery = "(pointer: coarse)";
function subscribe(onChange: () => void) {
  const mq = window.matchMedia(coarsePointerQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

type Props = {
  onVideoSelected: (file: File) => void;
};

// Two ways to get a video in: pick one from the device, or record a new one.
// Both use a plain file <input>. Adding capture="environment" tells phones to
// open the back camera. This works over plain http on the local network,
// unlike live camera APIs that require https.
export default function VideoUpload({ onVideoSelected }: Props) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const recordRef = useRef<HTMLInputElement>(null);
  // Only show "Record" on touch devices, where it opens the camera.
  const canRecord = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(coarsePointerQuery).matches,
    () => false,
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onVideoSelected(file);
    e.target.value = ""; // allow picking the same file again later
  }

  return (
    <div className="flex flex-col items-center gap-6 rounded-3xl bg-white p-6 text-center shadow-sm">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-fairway-100 text-4xl">
        🎥
      </div>
      <div>
        <h2 className="text-xl font-bold text-fairway-900">Add a video</h2>
        <p className="mt-1 text-sm text-fairway-700">
          Film from down the line or face on. Hold the phone steady at hip height.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          onClick={() => uploadRef.current?.click()}
          className="min-h-14 w-full rounded-2xl bg-fairway-600 text-lg font-semibold text-white shadow active:bg-fairway-700"
        >
          Upload video
        </button>
        {canRecord && (
          <button
            onClick={() => recordRef.current?.click()}
            className="min-h-14 w-full rounded-2xl border-2 border-fairway-600 bg-white text-lg font-semibold text-fairway-700 active:bg-fairway-50"
          >
            Record with camera
          </button>
        )}
      </div>

      <input
        ref={uploadRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={recordRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
