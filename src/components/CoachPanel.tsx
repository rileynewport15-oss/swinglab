"use client";

import { useEffect, useRef, useState } from "react";
import type { ShotMode } from "@/config/analysisConfig";
import type { Report } from "@/lib/analysis/report";
import { COACHES, DEFAULT_COACH, coachById, isCoachId, type CoachId } from "@/lib/coach/coaches";
import { QUESTIONS, answer, newMemory, opening, type Question } from "@/lib/coach/engine";
import { speech } from "@/lib/coach/voice";

type Props = {
  report: Report | null; // null until a swing is found
  mode: ShotMode;
};

type Turn = { from: "coach" | "golfer"; text: string };

const COACH_KEY = "swinglab.coach";
const MUTED_KEY = "swinglab.coachMuted";

function loadSaved<T>(key: string, valid: (v: unknown) => v is T, fallback: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return valid(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing etc.: the choice just won't be remembered.
  }
}

const isBool = (v: unknown): v is boolean => typeof v === "boolean";

// A virtual coach for this swing. It opens with its take once the analysis is
// done, then answers the question buttons, out loud unless muted. Everything
// it says comes from the results and the line bank (src/data/coachLines.ts),
// all in the browser. The conversation belongs to this video (the analyzer
// remounts this card for a new one) and to the chosen coach (switching coach
// starts over).
export default function CoachPanel({ report, mode }: Props) {
  // (This card only renders in the browser, after a video is picked.)
  const [coachId, setCoachId] = useState<CoachId>(() => loadSaved(COACH_KEY, isCoachId, DEFAULT_COACH));
  const [muted, setMuted] = useState(() => loadSaved(MUTED_KEY, isBool, false));
  const [turns, setTurns] = useState<Turn[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const memory = useRef(newMemory());
  const openedFor = useRef<CoachId | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const coach = coachById(coachId);

  function say(text: string, who: CoachId) {
    if (muted || !text) return;
    setSpeaking(true);
    speech().speak(text, coachById(who).voice, () => setSpeaking(false));
  }

  function stopSpeaking() {
    speech().stop();
    setSpeaking(false);
  }

  // Stop talking when the card goes away (new video, new page).
  useEffect(() => () => speech().stop(), []);

  // Keep the newest message in view.
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  // The opening take, once per coach per video, as soon as there are results.
  // (Some browsers only allow speech after a click; the text still shows.)
  useEffect(() => {
    if (!report || openedFor.current === coachId) return;
    openedFor.current = coachId;
    const text = opening(report, mode, coachId, memory.current);
    setTurns([{ from: "coach", text }]);
    say(text, coachId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when results first arrive or the coach changes
  }, [report !== null, coachId]);

  function ask(q: Question) {
    if (!report) return;
    stopSpeaking();
    const text = answer(q, report, mode, coachId, memory.current);
    setTurns((t) => [...t, { from: "golfer", text: QUESTIONS.find((x) => x.id === q)!.label }, { from: "coach", text }]);
    say(text, coachId);
  }

  function pickCoach(id: CoachId) {
    if (id === coachId) return;
    stopSpeaking();
    memory.current = newMemory();
    setTurns([]);
    setCoachId(id);
    save(COACH_KEY, id);
  }

  function toggleMute() {
    if (!muted) stopSpeaking();
    setMuted(!muted);
    save(MUTED_KEY, !muted);
  }

  return (
    <section aria-label="Coach" className="flex flex-col rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-fairway-900">Coach</h2>
        <div className="flex items-center gap-1">
          {speaking && (
            <button
              onClick={stopSpeaking}
              className="flex min-h-9 items-center gap-1 rounded-lg bg-fairway-100 px-2.5 text-xs font-semibold text-fairway-800 hover:bg-fairway-200"
            >
              <span aria-hidden>■</span> Stop
            </button>
          )}
          <button
            onClick={toggleMute}
            aria-pressed={!muted}
            aria-label={muted ? "Spoken replies off. Turn on" : "Spoken replies on. Turn off"}
            title={muted ? "Spoken replies are off" : "Spoken replies are on"}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg hover:bg-fairway-50"
          >
            <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
          </button>
        </div>
      </div>

      <div role="radiogroup" aria-label="Choose your coach" className="mt-2 grid grid-cols-3 gap-1.5">
        {COACHES.map((c) => (
          <button
            key={c.id}
            role="radio"
            aria-checked={c.id === coachId}
            onClick={() => pickCoach(c.id)}
            className={`flex flex-col items-center gap-0.5 rounded-xl p-2 text-center ${
              c.id === coachId ? "bg-fairway-700 text-white" : "bg-fairway-50 text-fairway-900 hover:bg-fairway-100"
            }`}
          >
            <span aria-hidden className="text-2xl leading-none">
              {c.avatar}
            </span>
            <span className="text-xs font-bold">{c.name}</span>
            <span className={`text-[10px] leading-tight ${c.id === coachId ? "text-fairway-100" : "text-fairway-600"}`}>{c.tagline}</span>
          </button>
        ))}
      </div>

      <div
        ref={chatRef}
        aria-live="polite"
        className="mt-3 flex max-h-72 min-h-24 flex-col gap-2 overflow-y-auto rounded-xl bg-fairway-50 p-2"
      >
        {!report && <p className="p-1 text-xs text-fairway-700">Your coach will weigh in once a swing is found in the video.</p>}
        {turns.map((t, i) =>
          t.from === "coach" ? (
            <div key={i} className="flex items-start gap-2">
              <span aria-hidden className="mt-0.5 text-lg leading-none">
                {coach.avatar}
              </span>
              <p className="rounded-xl rounded-tl-sm bg-white px-3 py-2 text-sm text-fairway-900 shadow-sm">
                <span className="sr-only">{coach.name}: </span>
                {t.text}
              </p>
            </div>
          ) : (
            <p key={i} className="ml-8 self-end rounded-xl rounded-tr-sm bg-fairway-700 px-3 py-2 text-sm text-white">
              <span className="sr-only">You: </span>
              {t.text}
            </p>
          ),
        )}
      </div>

      <div role="group" aria-label={`Ask ${coach.name}`} className="mt-2 flex flex-wrap gap-1.5">
        {QUESTIONS.map((q) => (
          <button
            key={q.id}
            onClick={() => ask(q.id)}
            disabled={!report}
            className="min-h-9 rounded-full bg-fairway-100 px-3 text-xs font-semibold text-fairway-800 hover:bg-fairway-200 disabled:opacity-40"
          >
            {q.label}
          </button>
        ))}
      </div>
    </section>
  );
}
