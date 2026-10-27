"use client";

import { useEffect, useRef, useState } from "react";
import PlayerControls from "./PlayerControls";
import DrawingCanvas from "./DrawingCanvas";
import DrawingToolbar from "./DrawingToolbar";
import TrainingAidsMenu from "./TrainingAidsMenu";
import { useDrawing } from "@/hooks/useDrawing";

type Props = {
  videoUrl: string;
  onChangeVideo: () => void;
};

// The review screen: the video (with drawings on top) plus all the controls.
export default function VideoAnalyzer({ videoUrl, onChangeVideo }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [aspect, setAspect] = useState(9 / 16);
  const drawing = useDrawing();

  // Match the stage's shape to the video so drawings line up with the picture.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onMeta = () => {
      if (video.videoWidth && video.videoHeight) {
        setAspect(video.videoWidth / video.videoHeight);
      }
    };
    video.addEventListener("loadedmetadata", onMeta);
    if (video.readyState >= 1) onMeta();
    return () => video.removeEventListener("loadedmetadata", onMeta);
  }, [videoUrl]);

  return (
    <div className="flex flex-col gap-4">
      {/* Stage: limited to 65% of screen height so controls stay visible on a phone */}
      <div
        className="no-select relative mx-auto w-full overflow-hidden rounded-3xl bg-black shadow-lg"
        style={{ aspectRatio: aspect, maxWidth: `calc(65svh * ${aspect})` }}
      >
        <video
          ref={videoRef}
          // "#t=0.001" makes iPhones show the first frame instead of a black box
          src={`${videoUrl}#t=0.001`}
          playsInline
          muted
          preload="auto"
          className="absolute inset-0 h-full w-full object-contain"
        />
        <DrawingCanvas drawing={drawing} />
      </div>

      <PlayerControls videoRef={videoRef} />
      <TrainingAidsMenu drawing={drawing} />
      <DrawingToolbar drawing={drawing} />

      <button
        onClick={onChangeVideo}
        className="min-h-12 rounded-2xl text-sm font-semibold text-fairway-700 underline-offset-4 active:underline"
      >
        Choose a different video
      </button>
    </div>
  );
}
