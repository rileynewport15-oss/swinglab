"use client";

import { useEffect, useState } from "react";
import ModeSelector, { MODES, type Mode } from "@/components/ModeSelector";
import VideoUpload from "@/components/VideoUpload";
import VideoAnalyzer from "@/components/VideoAnalyzer";

export default function Home() {
  const [mode, setMode] = useState<Mode>("full-swing");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // The video stays on the device: we make a temporary local URL for it
  // instead of uploading it anywhere. Free it when it's replaced.
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const modeLabel = MODES.find((m) => m.id === mode)?.label;

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 bg-fairway-800 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-md">
        <div className="mx-auto flex max-w-xl flex-col gap-3">
          <h1 className="text-lg font-bold tracking-tight text-white">
            ⛳ SwingLab
          </h1>
          <ModeSelector mode={mode} onChange={setMode} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="text-sm font-medium text-fairway-700">
          Reviewing: <span className="font-bold">{modeLabel}</span>
        </p>

        {videoUrl ? (
          <VideoAnalyzer
            videoUrl={videoUrl}
            onChangeVideo={() => setVideoUrl(null)}
          />
        ) : (
          <VideoUpload
            onVideoSelected={(file) => setVideoUrl(URL.createObjectURL(file))}
          />
        )}
      </main>
    </div>
  );
}
