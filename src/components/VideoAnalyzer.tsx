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
import PuttOverlay from "./PuttOverlay";
import { useAidSettings } from "@/hooks/useAidSettings";
import { AIDS_FOR, AID_NAMES, aidShownAt, type AidKey, type AidSettings } from "@/lib/aidVisibility";
import type { Marker } from "./MomentMarkers";
import type { Jump } from "./PlayerControls";
import { useDrawing } from "@/hooks/useDrawing";
import { usePoseAnalysis } from "@/hooks/usePoseAnalysis";
import { buildAutoAids, type CameraAngle } from "@/lib/pose/autoAids";
import { nearestFrame, type Landmark, type PoseTrack, type Px } from "@/lib/pose/landmarks";
import type { KeyMoments } from "@/lib/analysis/keyMoments";
import { analyzeSwing } from "@/lib/analysis/metrics";
import type { Finding } from "@/lib/analysis/findings";
import { analyzePutt } from "@/lib/putting/metrics";
import { buildPuttAids } from "@/lib/putting/aids";
import type { PuttMoments } from "@/lib/putting/moments";
import { MOMENT_SPECS, allFound, momentTime, type Moments } from "@/lib/moments";
import type { ShotMode } from "@/config/analysisConfig";
import type { AidKind } from "@/lib/shapes";

type Props = {
  videoUrl: string;
  mode: ShotMode;
  onChangeVideo: () => void;
};

const MIN_GAP = 0.03; // seconds kept between markers so they stay in order (e.g. Address → Top → Impact)

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
  const [moments, setMoments] = useState<Moments | null>(null);
  const [activeFinding, setActiveFinding] = useState<string | null>(null);
  const [highlightAid, setHighlightAid] = useState<AidKind | null>(null);

  function jumpTo(time: number) {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = time;
  }

  // The address (setup, for putts) time the aids were last placed at.
  const aidsAddressRef = useRef<number | null>(null);
  const specs = MOMENT_SPECS[mode];
  const firstMoment = specs[0].id; // address, or setup for putts

  function placeAids(track: PoseTrack, pose: Landmark[], angle: CameraAngle, time: number, m: Moments | null, ball: Px | null) {
    drawing.placeAutoAids(
      mode === "putt"
        ? buildPuttAids(pose, angle, track, allFound(m, mode) ? (m as PuttMoments) : null, ball)
        : buildAutoAids(pose, angle, track),
    );
    aidsAddressRef.current = time;
  }

  // When analysis finishes: place the aids, mark the key moments, show the address (setup) frame.
  const analysis = usePoseAnalysis(videoUrl, mode, (track, address, found, ball) => {
    // Without the swing, keep just the address marker so it can still be adjusted.
    const m = found ?? (Object.fromEntries(specs.map((x, i) => [x.id, i === 0 ? address.time : NaN])) as Moments);
    placeAids(track, address.landmarks, cameraAngle, address.time, m, ball);
    setMoments(m);
    jumpTo(address.time);
    saveAngle(cameraAngle); // counts as answered, even if the default was kept
    setAngleAsked(true);
  });
  const ball = analysis.status === "ready" ? analysis.ball : null;

  function changeAngle(angle: CameraAngle) {
    setCameraAngle(angle);
    saveAngle(angle);
    setAngleAsked(true);
    if (analysis.status === "ready") placeAids(analysis.track, addressPose(), angle, addressTime(), moments, ball);
  }

  // The (possibly user-adjusted) address marker time, and the pose there.
  function addressTime(): number {
    const t = momentTime(moments, firstMoment);
    return Number.isFinite(t) ? t : analysis.status === "ready" ? analysis.address.time : 0;
  }
  function addressPose(): Landmark[] {
    if (analysis.status !== "ready") return [];
    return nearestFrame(analysis.track, addressTime())?.landmarks ?? analysis.address.landmarks;
  }

  const swingFound = allFound(moments, mode);

  // Findings recalculate instantly when a marker or the camera angle changes.
  const findings = useMemo(() => {
    if (analysis.status !== "ready" || !swingFound || !moments) return [];
    return mode === "putt"
      ? analyzePutt({ track: analysis.track, moments: moments as PuttMoments, angle: cameraAngle, ball: analysis.ball })
      : analyzeSwing({ track: analysis.track, moments: moments as KeyMoments, angle: cameraAngle });
  }, [analysis, swingFound, moments, mode, cameraAngle]);

  const markers: Marker[] = specs
    .filter((spec) => Number.isFinite(momentTime(moments, spec.id)))
    .map((spec) => ({ ...spec, time: momentTime(moments, spec.id) }));

  // "Go to" buttons: address for full swings, every moment for putts.
  const jumps: Jump[] = (mode === "putt" ? markers : markers.slice(0, 1)).map((m) => ({
    id: m.id,
    label: mode === "putt" ? m.label : m.label.toLowerCase(),
    time: m.time,
  }));

  function moveMarker(id: string, time: number, done: boolean): number | undefined {
    if (!moments) return;
    const m = { ...moments } as Record<string, number>;
    // Keep the markers in order, a little apart.
    const i = specs.findIndex((x) => x.id === id);
    const prev = i > 0 ? m[specs[i - 1].id] : NaN;
    const next = i < specs.length - 1 ? m[specs[i + 1].id] : NaN;
    m[id] = Math.min(Math.max(time, Number.isFinite(prev) ? prev + MIN_GAP : -Infinity), Number.isFinite(next) ? next - MIN_GAP : Infinity);
    setMoments(m as Moments);
    // Aids are anchored to address (setup), so move them when that marker is
    // dropped somewhere new (a tap that doesn't move it keeps any fine-tuning).
    if (id === firstMoment && done && analysis.status === "ready" && m[id] !== aidsAddressRef.current) {
      const pose = nearestFrame(analysis.track, m[id])?.landmarks;
      if (pose) placeAids(analysis.track, pose, cameraAngle, m[id], m as Moments, ball);
    }
    return m[id];
  }

  // Is an aid on screen at this moment? Follows the Training aids card, with
  // one exception: right after you click a result, its aid is highlighted
  // even if switched off (a temporary highlight, see clearHighlight).
  function isAidShown(aid: AidKey, time: number) {
    if (aid === highlightAid) return true;
    // Only the aids for this mode and camera angle (a switched-on face on aid
    // stays hidden down the line, where its toggle isn't shown).
    if (!AIDS_FOR[mode][cameraAngle].includes(aid)) return false;
    return aidShownAt(aid, time, aidSettings, swingFound ? moments : null, mode);
  }

  // The highlighted aid is switched off in the card, so it's only on screen
  // because of the result that was clicked.
  const temporarilyShown = highlightAid !== null && !aidSettings.visible[highlightAid] ? highlightAid : null;

  // The temporary highlight ends when you change any aid setting or press play
  // (and when you open a different result or close this one, in selectFinding).
  function clearHighlight() {
    setHighlightAid(null);
  }

  function changeAidSettings(update: (prev: AidSettings) => AidSettings) {
    setAidSettings(update);
    clearHighlight();
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setHighlightAid(null);
    video.addEventListener("play", onPlay);
    return () => video.removeEventListener("play", onPlay);
  }, [videoUrl]);

  // Open a result (jump to it and highlight its aid), or close it (null).
  function selectFinding(f: Finding | null) {
    setActiveFinding(f?.id ?? null);
    setHighlightAid(f?.aid ?? null);
    if (f) jumpTo(f.time);
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
    // Laptop/desktop: three columns. Left = training aids + swing analysis,
    // center = video + controls (stays in view), right = results.
    // Phone: one column in this order: video (pinned at the top) + controls,
    // results, training aids, swing analysis. The column wrappers use
    // `contents` on phones so their cards join this single stack.
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(300px,380px)] lg:items-start lg:gap-5">
      {/* Center column */}
      <div className="contents lg:sticky lg:top-4 lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-4">
        {/* On phones this bar pins the video to the top of the screen. */}
        <div className="sticky top-0 z-20 -mx-4 bg-fairway-50 px-4 py-2 lg:static lg:m-0 lg:bg-transparent lg:p-0">
          {/* Stage height: smaller on phones so the pinned video leaves room to
              scroll; on computers, as tall as fits with the controls below. */}
          <div
            className="no-select relative mx-auto w-full overflow-hidden rounded-3xl bg-black shadow-lg [--stage-h:40svh] lg:[--stage-h:calc(100svh-430px)]"
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
            {analysis.status === "ready" && mode === "putt" && (
              <PuttOverlay
                videoRef={videoRef}
                track={analysis.track}
                moments={swingFound ? (moments as PuttMoments) : null}
                shownAt={isAidShown}
                highlightAid={highlightAid}
                showLabels={aidSettings.labels}
              />
            )}
            <DrawingCanvas
              drawing={drawing}
              highlightAid={highlightAid}
              videoRef={videoRef}
              aidShownAt={isAidShown}
              showLabels={aidSettings.labels}
            />
            {temporarilyShown && (
              <p
                role="status"
                className="pointer-events-none absolute inset-x-2 top-2 mx-auto w-fit rounded-full bg-fairway-900/85 px-3 py-1.5 text-center text-xs font-semibold text-white shadow"
              >
                Showing {AID_NAMES[temporarilyShown]} for this result
              </p>
            )}
            {analysis.status === "analyzing" && (
              <AnalyzingOverlay
                mode={mode}
                progress={analysis.progress}
                askAngle={!angleAsked}
                cameraAngle={cameraAngle}
                onChooseAngle={changeAngle}
              />
            )}
          </div>
        </div>
        <PlayerControls
          videoRef={videoRef}
          markers={markers}
          onMarkerMove={moveMarker}
          jumps={jumps}
        />
      </div>

      {/* Right column: results (fits the screen and scrolls inside on computers) */}
      {analysis.status === "ready" && (
        <div className="lg:sticky lg:top-4 lg:col-start-3 lg:row-start-1">
          <ResultsPanel
            findings={findings}
            swingFound={swingFound}
            activeId={activeFinding}
            onSelect={selectFinding}
            mode={mode}
            note={
              mode === "putt" && cameraAngle === "down-the-line"
                ? "From down the line you see the stroke path and your eye line. Tempo, stroke length and the pendulum (shoulders, triangle) need a Face On video."
                : undefined
            }
          />
        </div>
      )}

      {/* Left column */}
      <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:gap-4">
        <AidsPanel
          settings={aidSettings}
          onChange={changeAidSettings}
          mode={mode}
          cameraAngle={cameraAngle}
          skeletonAvailable={analysis.status === "ready"}
          timingAvailable={swingFound}
        />
        <AnalysisPanel
          mode={mode}
          analysis={analysis}
          cameraAngle={cameraAngle}
          onChangeAngle={changeAngle}
          onResetAids={() =>
            analysis.status === "ready" && placeAids(analysis.track, addressPose(), cameraAngle, addressTime(), moments, ball)
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
