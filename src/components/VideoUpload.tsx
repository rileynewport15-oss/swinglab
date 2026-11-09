"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { ShotMode } from "@/config/analysisConfig";

// True on touch devices (phones/tablets). On the server we assume false.
const coarsePointerQuery = "(pointer: coarse)";
function subscribe(onChange: () => void) {
  const mq = window.matchMedia(coarsePointerQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

type Props = {
  mode: ShotMode;
  onVideoSelected: (file: File) => void;
  onTrySample: () => void;
};

// Ways to get a video in: pick one from the device, record a new one (phones),
// drag one onto the card (computers), or try a sample clip. Picking and
// recording use a plain file <input>; capture="environment" tells phones to
// open the back camera, which works over plain http on the local network,
// unlike live camera APIs that require https.
export default function VideoUpload({ mode, onVideoSelected, onTrySample }: Props) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const recordRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  // Only show "Record" on touch devices, where it opens the camera; drag and
  // drop only makes sense with a mouse.
  const touch = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(coarsePointerQuery).matches,
    () => false,
  );
  const shot = mode === "putt" ? "putt" : "swing";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onVideoSelected(file);
    e.target.value = ""; // allow picking the same file again later
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.type.startsWith("video/") && !/\.(mov|mp4|m4v|webm)$/i.test(file.name)) {
      setDropError("That isn't a video. Drop a video file (like .mov or .mp4).");
      return;
    }
    setDropError(null);
    onVideoSelected(file);
  }

  return (
    <div
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        // Only when leaving the card itself, not moving between its children.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center gap-5 rounded-3xl bg-white p-6 text-center shadow-sm transition-shadow lg:p-8 ${
        dragging ? "ring-4 ring-fairway-500 ring-offset-2 ring-offset-fairway-50" : ""
      }`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-fairway-100 text-3xl" aria-hidden>
        🎥
      </div>
      <div>
        <h2 className="text-xl font-bold text-fairway-900">Add your {shot}</h2>
        <p className="mt-1 text-sm text-fairway-700">
          {touch ? "Pick a video or record one now." : "Choose a video, or drag one onto this card."}
        </p>
      </div>

      <div className="grid w-full gap-3 sm:grid-cols-2">
        <button
          onClick={() => uploadRef.current?.click()}
          className="min-h-14 w-full rounded-2xl bg-fairway-600 text-lg font-semibold text-white shadow hover:bg-fairway-700 active:bg-fairway-700"
        >
          Upload video
        </button>
        <button
          onClick={onTrySample}
          className="min-h-14 w-full rounded-2xl border-2 border-fairway-600 bg-white text-lg font-semibold text-fairway-700 hover:bg-fairway-50 active:bg-fairway-50"
        >
          Try a sample {shot}
        </button>
        {touch && (
          <button
            onClick={() => recordRef.current?.click()}
            className="min-h-14 w-full rounded-2xl border-2 border-fairway-600 bg-white text-lg font-semibold text-fairway-700 active:bg-fairway-50 sm:col-span-2"
          >
            Record with camera
          </button>
        )}
      </div>

      {dropError && (
        <p role="alert" className="text-sm text-red-700">
          {dropError}
        </p>
      )}
      <p className="flex items-center gap-1.5 text-xs text-fairway-600">
        <span aria-hidden>🔒</span>
        Your video is analyzed in your browser and never uploaded to a server.
      </p>

      {dragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-3xl bg-fairway-50/90 text-lg font-bold text-fairway-800">
          Drop your video to analyze it
        </div>
      )}

      <input ref={uploadRef} type="file" accept="video/*" className="hidden" onChange={handleChange} />
      <input ref={recordRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleChange} />
    </div>
  );
}
