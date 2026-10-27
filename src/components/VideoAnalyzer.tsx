"use client";

import { useEffect, useRef, useState } from "react";
import PlayerControls from "./PlayerControls";
import DrawingCanvas from "./DrawingCanvas";
import DrawingToolbar from "./DrawingToolbar";
import PoseOverlay from "./PoseOverlay";
import AnalyzingOverlay from "./AnalyzingOverlay";
import AnalysisPanel from "./AnalysisPanel";
import { useDrawing } from "@/hooks/useDrawing";
import { usePoseAnalysis } from "@/hooks/usePoseAnalysis";
import { buildAutoAids, type CameraAngle } from "@/lib/pose/autoAids";
import type { AddressFrame } from "@/lib/pose/address";
import type { PoseTrack } from "@/lib/pose/landmarks";

type Props = {
  videoUrl: string;
  onChangeVideo: () => void;
};

// The camera angle is asked once, then remembered in this browser.
const ANGLE_KEY = "swinglab.cameraAngle";
function loadAngle(): CameraAngle | null {
  try {
    const saved = localStorage.getItem(ANGLE_KEY);
    return saved === "face-on" || saved === "down-the-line" ? saved : null;
  } catch {
    return null;
  }
}
function saveAngle(angle: CameraAngle) {
  try {
    localStorage.setItem(ANGLE_KEY, angle);
  } catch {
    // Private browsing etc.: we'll just ask again next time.
  }
}

// The review screen: the video (with pose skeleton and aids on top) plus all the controls.
export default function VideoAnalyzer({ videoUrl, onChangeVideo }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [aspect, setAspect] = useState(9 / 16);
  const drawing = useDrawing();
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>(() => loadAngle() ?? "face-on");
  const [angleAsked, setAngleAsked] = useState(() => loadAngle() !== null);
  const [showSkeleton, setShowSkeleton] = useState(false);

  function jumpTo(time: number) {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = time;
  }

  function placeAids(track: PoseTrack, address: AddressFrame, angle: CameraAngle) {
    drawing.placeAutoAids(buildAutoAids(address.landmarks, angle, track));
  }

  // When analysis finishes: place the aids and show the address frame.
  const analysis = usePoseAnalysis(videoUrl, (track, address) => {
    placeAids(track, address, cameraAngle);
    jumpTo(address.time);
    saveAngle(cameraAngle); // counts as answered, even if the default was kept
    setAngleAsked(true);
  });

  function changeAngle(angle: CameraAngle) {
    setCameraAngle(angle);
    saveAngle(angle);
    setAngleAsked(true);
    if (analysis.status === "ready") placeAids(analysis.track, analysis.address, angle);
  }

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
    // On wide screens: video and player on the left, tool panels on the right.
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="flex flex-col gap-4">
        {/* Stage height: 65% of the screen on phones; on computers, as tall as fits
            with the player controls still visible below it. */}
        <div
          className="no-select relative mx-auto w-full overflow-hidden rounded-3xl bg-black shadow-lg [--stage-h:65svh] lg:[--stage-h:calc(100svh-300px)]"
          style={{ aspectRatio: aspect, maxWidth: `calc(var(--stage-h) * ${aspect})` }}
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
          {analysis.status === "ready" && showSkeleton && (
            <PoseOverlay videoRef={videoRef} track={analysis.track} />
          )}
          <DrawingCanvas drawing={drawing} />
          {analysis.status === "analyzing" && (
            <AnalyzingOverlay
              progress={analysis.progress}
              askAngle={!angleAsked}
              cameraAngle={cameraAngle}
              onChooseAngle={changeAngle}
            />
          )}
        </div>
        <PlayerControls videoRef={videoRef} />
      </div>

      <div className="flex flex-col gap-4">
        <AnalysisPanel
          analysis={analysis}
          cameraAngle={cameraAngle}
          onChangeAngle={changeAngle}
          showSkeleton={showSkeleton}
          onToggleSkeleton={() => setShowSkeleton((s) => !s)}
          onJumpToAddress={() => analysis.status === "ready" && jumpTo(analysis.address.time)}
          onResetAids={() =>
            analysis.status === "ready" && placeAids(analysis.track, analysis.address, cameraAngle)
          }
          drawing={drawing}
        />
        <DrawingToolbar drawing={drawing} />
        <button
          onClick={onChangeVideo}
          className="min-h-12 rounded-2xl text-sm font-semibold text-fairway-700 underline-offset-4 hover:underline"
        >
          Choose a different video
        </button>
      </div>
    </div>
  );
}
