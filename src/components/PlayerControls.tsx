"use client";

import { useEffect, useState, type RefObject } from "react";
import MomentMarkers, { type Marker } from "./MomentMarkers";

const SPEEDS = [1, 0.5, 0.25, 0.125];

// Browsers don't tell us a video's frame rate, so we step by 1/30 s, which
// matches most phone videos. (Slow-mo clips are already slowed down on export.)
const FRAME_STEP = 1 / 30;

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  markers?: Marker[];
  onMarkerMove?: (id: string, time: number, done: boolean) => void;
};

// Play/pause, scrubber, speed and frame-step controls for the <video> above it.
// The video element itself lives in VideoAnalyzer so the drawing canvas can sit on top.
export default function PlayerControls({ videoRef, markers, onMarkerMove }: Props) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  // Keep our state in sync with the video element.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let frameId = 0;
    // "timeupdate" only fires a few times a second, so while playing we read
    // the time every animation frame to keep the scrubber smooth.
    const tick = () => {
      setTime(video.currentTime);
      frameId = requestAnimationFrame(tick);
    };

    const onPlay = () => {
      setPlaying(true);
      frameId = requestAnimationFrame(tick);
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(frameId);
      setTime(video.currentTime);
    };
    const onMeta = () => {
      setDuration(video.duration);
      video.playbackRate = speed;
    };
    const onSeeked = () => setTime(video.currentTime);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onPause);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("seeked", onSeeked);
    if (video.readyState >= 1) onMeta();

    return () => {
      cancelAnimationFrame(frameId);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onPause);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("seeked", onSeeked);
    };
    // `speed` is read only on first load; changeSpeed handles later changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) video.play();
    else video.pause();
  }

  function seek(t: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(t, 0), video.duration || 0);
    setTime(video.currentTime);
  }

  function stepFrame(direction: 1 | -1) {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    seek(video.currentTime + direction * FRAME_STEP);
  }

  function changeSpeed(s: number) {
    if (videoRef.current) videoRef.current.playbackRate = s;
    setSpeed(s);
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm">
      {/* Scrubber */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          {markers && markers.length > 0 && (
            <MomentMarkers
              duration={duration}
              markers={markers}
              onSeek={(t) => {
                videoRef.current?.pause();
                seek(t);
              }}
              onMove={(id, t, done) => {
                videoRef.current?.pause();
                seek(t);
                onMarkerMove?.(id, t, done);
              }}
            />
          )}
          <input
            type="range"
            className="scrubber w-full"
            aria-label="Video position"
            min={0}
            max={duration || 0}
            step={0.001}
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
          />
        </div>
        <span className="w-24 text-right text-sm tabular-nums text-fairway-700">
          {time.toFixed(2)} / {duration.toFixed(2)}s
        </span>
      </div>

      {/* Frame back, play/pause, frame forward */}
      <div className="flex items-center justify-center gap-3">
        <ControlButton label="Back one frame" onClick={() => stepFrame(-1)}>
          ⏮︎ <span className="text-xs">Frame</span>
        </ControlButton>
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-fairway-600 text-2xl text-white shadow active:bg-fairway-700"
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <ControlButton label="Forward one frame" onClick={() => stepFrame(1)}>
          <span className="text-xs">Frame</span> ⏭︎
        </ControlButton>
      </div>

      {/* Speed */}
      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Playback speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => changeSpeed(s)}
            aria-pressed={speed === s}
            className={`min-h-12 rounded-xl text-sm font-semibold ${
              speed === s
                ? "bg-fairway-700 text-white"
                : "bg-fairway-50 text-fairway-800 active:bg-fairway-100"
            }`}
          >
            {s === 0.125 ? "⅛x" : `${s}x`}
          </button>
        ))}
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-fairway-50 px-3 font-semibold text-fairway-800 active:bg-fairway-100"
    >
      {children}
    </button>
  );
}
