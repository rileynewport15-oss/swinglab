"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PlayerControls from "./PlayerControls";
import DrawingCanvas from "./DrawingCanvas";
import DrawingToolbar from "./DrawingToolbar";
import PoseOverlay from "./PoseOverlay";
import AnalyzingOverlay from "./AnalyzingOverlay";
import AnalysisPanel from "./AnalysisPanel";
import ResultsPanel from "./ResultsPanel";
import AidsPanel from "./AidsPanel";
import { useAidSettings } from "@/hooks/useAidSettings";
import { aidShownAt, type AidKey } from "@/lib/aidVisibility";
import type { Marker } from "./MomentMarkers";
import { useDrawing } from "@/hooks/useDrawing";
import { usePoseAnalysis } from "@/hooks/usePoseAnalysis";
import { buildAutoAids, type CameraAngle } from "@/lib/pose/autoAids";
import { nearestFrame, type Landmark, type PoseTrack } from "@/lib/pose/landmarks";
import { MOMENT_LABELS, type KeyMoments, type MomentId } from "@/lib/analysis/keyMoments";
import { analyzeSwing, type Finding } from "@/lib/analysis/metrics";
import type { ShotMode } from "@/config/analysisConfig";
import type { AidKind } from "@/lib/shapes";

type Props = {
  videoUrl: string;
  mode: ShotMode;
  onChangeVideo: () => void;
};

const MARKER_STYLE: Record<MomentId, { short: string; color: string }> = {
  address: { short: "A", color: "#0ea5e9" },
  top: { short: "T", color: "#f59e0b" },
  impact: { short: "I", color: "#ef4444" },
};
const MIN_GAP = 0.03; // seconds kept between markers so their order stays Address → Top → Impact

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
export default function VideoAnalyzer({ videoUrl, mode, onChangeVideo }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [aspect, setAspect] = useState(9 / 16);
  const drawing = useDrawing();
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>(() => loadAngle() ?? "face-on");
  const [angleAsked, setAngleAsked] = useState(() => loadAngle() !== null);
  const [aidSettings, setAidSettings] = useAidSettings();
  const [moments, setMoments] = useState<KeyMoments | null>(null);
  const [activeFinding, setActiveFinding] = useState<string | null>(null);
  const [highlightAid, setHighlightAid] = useState<AidKind | null>(null);

  function jumpTo(time: number) {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = time;
  }

  // The address time the aids were last placed at.
  const aidsAddressRef = useRef<number | null>(null);

  function placeAids(track: PoseTrack, addressPose: Landmark[], angle: CameraAngle, addressTime: number) {
    drawing.placeAutoAids(buildAutoAids(addressPose, angle, track));
    aidsAddressRef.current = addressTime;
  }

  // When analysis finishes: place the aids, mark the key moments, show the address frame.
  const analysis = usePoseAnalysis(videoUrl, (track, address, found) => {
    placeAids(track, address.landmarks, cameraAngle, address.time);
    setMoments(found ?? { address: address.time, top: NaN, impact: NaN });
    jumpTo(address.time);
    saveAngle(cameraAngle); // counts as answered, even if the default was kept
    setAngleAsked(true);
  });

  function changeAngle(angle: CameraAngle) {
    setCameraAngle(angle);
    saveAngle(angle);
    setAngleAsked(true);
    if (analysis.status === "ready") placeAids(analysis.track, addressPose(), angle, addressTime());
  }

  // The (possibly user-adjusted) address marker time, and the pose there.
  function addressTime(): number {
    return moments?.address ?? (analysis.status === "ready" ? analysis.address.time : 0);
  }
  function addressPose(): Landmark[] {
    if (analysis.status !== "ready") return [];
    return nearestFrame(analysis.track, addressTime())?.landmarks ?? analysis.address.landmarks;
  }

  const swingFound = moments !== null && Number.isFinite(moments.top) && Number.isFinite(moments.impact);

  // Findings recalculate instantly when a marker, the mode or the camera angle changes.
  const findings = useMemo(
    () =>
      analysis.status === "ready" && swingFound && moments
        ? analyzeSwing({ track: analysis.track, moments, mode, angle: cameraAngle })
        : [],
    [analysis, swingFound, moments, mode, cameraAngle],
  );

  const markers: Marker[] = moments
    ? (Object.keys(MOMENT_LABELS) as MomentId[])
        .filter((id) => Number.isFinite(moments[id]))
        .map((id) => ({ id, label: MOMENT_LABELS[id], time: moments[id], ...MARKER_STYLE[id] }))
    : [];

  function moveMarker(id: string, time: number, done: boolean): number | undefined {
    if (!moments) return;
    const m = { ...moments };
    // Keep the order Address → Top → Impact.
    if (id === "address") m.address = Math.min(time, (Number.isFinite(m.top) ? m.top : Infinity) - MIN_GAP);
    if (id === "top") m.top = Math.min(Math.max(time, m.address + MIN_GAP), m.impact - MIN_GAP);
    if (id === "impact") m.impact = Math.max(time, m.top + MIN_GAP);
    setMoments(m);
    // Aids are anchored to address, so move them when the address marker is
    // dropped somewhere new (a tap that doesn't move it keeps any fine-tuning).
    if (id === "address" && done && analysis.status === "ready" && m.address !== aidsAddressRef.current) {
      const pose = nearestFrame(analysis.track, m.address)?.landmarks;
      if (pose) placeAids(analysis.track, pose, cameraAngle, m.address);
    }
    return m[id as MomentId];
  }

  // Is an aid on screen at this moment? (Aids panel choices; a result the user
  // clicked always shows its aid so the highlight is visible.)
  function isAidShown(aid: AidKey, time: number) {
    if (aid === highlightAid) return true;
    return aidShownAt(aid, time, aidSettings, swingFound ? moments : null);
  }

  function selectFinding(f: Finding) {
    setActiveFinding(f.id);
    setHighlightAid(f.aid ?? null);
    jumpTo(f.time);
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
          {analysis.status === "ready" && aidSettings.visible.skeleton && (
            <PoseOverlay
              videoRef={videoRef}
              track={analysis.track}
              shownAt={(time) => isAidShown("skeleton", time)}
            />
          )}
          <DrawingCanvas
            drawing={drawing}
            highlightAid={highlightAid}
            videoRef={videoRef}
            aidShownAt={isAidShown}
            showLabels={aidSettings.labels}
          />
          {analysis.status === "analyzing" && (
            <AnalyzingOverlay
              progress={analysis.progress}
              askAngle={!angleAsked}
              cameraAngle={cameraAngle}
              onChooseAngle={changeAngle}
            />
          )}
        </div>
        <PlayerControls videoRef={videoRef} markers={markers} onMarkerMove={moveMarker} />
      </div>

      <div className="flex flex-col gap-4">
        {analysis.status === "ready" && (
          <ResultsPanel
            findings={findings}
            swingFound={swingFound}
            activeId={activeFinding}
            onSelect={selectFinding}
          />
        )}
        <AidsPanel
          settings={aidSettings}
          onChange={setAidSettings}
          cameraAngle={cameraAngle}
          skeletonAvailable={analysis.status === "ready"}
          timingAvailable={swingFound}
        />
        <AnalysisPanel
          analysis={analysis}
          cameraAngle={cameraAngle}
          onChangeAngle={changeAngle}
          addressTime={moments?.address ?? null}
          onJumpToAddress={() => moments && jumpTo(moments.address)}
          onResetAids={() => analysis.status === "ready" && placeAids(analysis.track, addressPose(), cameraAngle, addressTime())}
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
