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
      <header className="bg-fairway-800 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-md">
        <div className="mx-auto flex max-w-xl flex-col gap-3 lg:max-w-[1400px] lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-lg font-bold tracking-tight text-white">
            ⛳ SwingLab
          </h1>
          <div className="lg:w-[420px]">
            <ModeSelector mode={mode} onChange={setMode} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl lg:max-w-[1400px] flex-1 flex-col gap-4 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="text-sm font-medium text-fairway-700">
          Reviewing: <span className="font-bold">{modeLabel}</span>
        </p>

        {videoUrl ? (
          <VideoAnalyzer
            // Putts and full swings are analyzed differently, so switching
            // mode starts the review of the same video over.
            key={mode}
            videoUrl={videoUrl}
            mode={mode}
            onChangeVideo={() => setVideoUrl(null)}
          />
        ) : (
          <div className="w-full lg:mx-auto lg:max-w-md">
            <VideoUpload
              onVideoSelected={(file) => setVideoUrl(URL.createObjectURL(file))}
            />
          </div>
        )}
      </main>
    </div>
  );
}
