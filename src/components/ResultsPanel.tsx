"use client";

import { useState } from "react";
import type { Finding } from "@/lib/analysis/findings";
import type { Report, PhaseStatus } from "@/lib/analysis/report";
import type { ShotMode } from "@/config/analysisConfig";
import { buildPracticePlan } from "@/lib/analysis/practicePlan";
import HowToFix from "./HowToFix";
import PracticePlanModal from "./PracticePlanModal";

type Props = {
  report: Report | null;
  swingFound: boolean;
  activeId: string | null; // the expanded result
  onSelect: (finding: Finding | null) => void; // open a result, or close it (null)
  onJump: (time: number) => void; // show a moment of the swing (phase strip)
  mode: ShotMode;
  note?: string; // extra line under the heading (e.g. what this camera angle can't show)
};

const NOT_FOUND: Record<ShotMode, string> = {
  "full-swing":
    "We couldn't spot a full swing in this clip, so there are no results yet. Make sure the whole swing is in the video, or drag the A / T / I markers on the scrubber.",
  putt: "We couldn't time this putt, so there are no results yet. Start recording while you're still at setup (before the putter moves), keep the camera still, and keep filming until you've held your finish.",
};

// The summary, the one thing to work on first, how each phase went, then
// "Areas to improve" and "Strengths" as collapsible sections. Each result shows
// its badge, title and confidence; clicking it opens the details, jumps the
// video to that moment and highlights the matching aid. On computers the card
// fits the screen and scrolls inside itself.
export default function ResultsPanel({ report, swingFound, activeId, onSelect, onJump, mode, note }: Props) {
  const [open, setOpen] = useState({ improve: true, strengths: false });
  const [showPlan, setShowPlan] = useState(false);
  const findings = report?.findings ?? [];
  const improve = findings.filter((f) => f.status === "improve");
  const strengths = findings.filter((f) => f.status === "strength");
  const shown = swingFound && report !== null;
  // The same drills aren't repeated: later results with the same issue point back.
  const drillsFirst = new Map<string, string>();
  for (const f of improve) if (f.issue && !drillsFirst.has(f.issue)) drillsFirst.set(f.issue, f.id);

  return (
    <div className="flex flex-col rounded-3xl bg-white shadow-sm lg:max-h-[calc(100svh-2rem)]">
      <div className="p-4 pb-2">
        <h2 className="font-bold text-fairway-900">Your results</h2>
        {shown ? (
          <p className="mt-1 text-sm leading-snug text-fairway-900">{report.summary}</p>
        ) : (
          <p className="text-xs text-fairway-700">{NOT_FOUND[mode]}</p>
        )}
        {shown && note && <p className="mt-1 text-xs text-fairway-600">{note}</p>}
        {shown && (
          <button
            onClick={() => setShowPlan(true)}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-fairway-700 text-sm font-semibold text-white hover:bg-fairway-800"
          >
            <span aria-hidden>📅</span> Build my practice plan
          </button>
        )}
      </div>
      {showPlan && <PracticePlanModal plan={buildPracticePlan(findings, mode)} onClose={() => setShowPlan(false)} />}

      {shown && (
        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto px-4 pb-4">
          {report.focus && (
            <section aria-label="Focus on this first" className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">Focus on this first</p>
              <p className="mt-1 text-sm font-semibold text-fairway-900">{report.focus.finding.title}</p>
              <p className="mt-1 text-xs text-fairway-800">{report.focus.why}</p>
              <p className="mt-2 text-xs text-fairway-900">
                <span className="font-bold">Try this feel: </span>
                {report.focus.cue}
              </p>
              <button
                onClick={() => onSelect(report.focus!.finding)}
                className="-ml-2 mt-1 inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-fairway-700 underline-offset-2 hover:bg-white/70 hover:underline"
              >
                <span aria-hidden>▶</span> See it at {report.focus.finding.time.toFixed(2)}s
              </button>
            </section>
          )}
          <PhaseStrip phases={report.phases} onJump={onJump} />
          <Section
            title="Areas to improve"
            tone="improve"
            items={improve}
            open={open.improve}
            onToggle={() => setOpen((o) => ({ ...o, improve: !o.improve }))}
            activeId={activeId}
            onSelect={onSelect}
            drillsFirst={drillsFirst}
            empty={mode === "putt" ? "Nothing to fix in this stroke." : "Nothing to fix in this swing."}
          />
          <Section
            title="Strengths"
            tone="good"
            items={strengths}
            open={open.strengths}
            onToggle={() => setOpen((o) => ({ ...o, strengths: !o.strengths }))}
            activeId={activeId}
            onSelect={onSelect}
            drillsFirst={drillsFirst}
            empty="Keep working. Your strengths will show up here."
          />
          {report.hidden.length > 0 && (
            <p className="px-1 pt-1 text-xs text-fairway-600">
              Not shown because the video wasn&apos;t clear enough to trust them:{" "}
              {report.hidden.map((f) => f.label ?? f.title).join(", ")}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// One small chip per phase of the swing: green = fine, amber/red = an issue
// there, gray = nothing measured. Clicking one shows that moment.
function PhaseStrip({ phases, onJump }: { phases: PhaseStatus[]; onJump: (time: number) => void }) {
  const styles = {
    good: { dot: "bg-fairway-600", text: "Good" },
    minor: { dot: "bg-amber-500", text: "Minor issue" },
    major: { dot: "bg-red-600", text: "Major issue" },
    none: { dot: "bg-fairway-200", text: "Not measured" },
  };
  return (
    <div role="group" aria-label="Phases" className="flex flex-wrap gap-1.5 py-1">
      {phases.map((p) => (
        <button
          key={p.id}
          onClick={() => p.time !== null && onJump(p.time)}
          disabled={p.time === null}
          title={`${p.name}: ${styles[p.status].text}`}
          aria-label={`${p.name}: ${styles[p.status].text}${p.time !== null ? `, go to ${p.time.toFixed(2)} seconds` : ""}`}
          className="flex min-h-8 items-center gap-1.5 rounded-full bg-fairway-50 px-2.5 text-xs font-semibold text-fairway-800 hover:bg-fairway-100 disabled:opacity-60"
        >
          <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${styles[p.status].dot}`} />
          {p.name}
        </button>
      ))}
    </div>
  );
}

function Section({
  title,
  tone,
  items,
  open,
  onToggle,
  activeId,
  onSelect,
  drillsFirst,
  empty,
}: {
  title: string;
  tone: "good" | "improve";
  items: Finding[];
  open: boolean;
  onToggle: () => void;
  activeId: string | null;
  onSelect: (f: Finding | null) => void;
  drillsFirst: Map<string, string>;
  empty: string;
}) {
  return (
    <section>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between rounded-xl px-1 text-left text-sm font-bold uppercase tracking-wide text-fairway-800 hover:bg-fairway-50"
      >
        <span>
          {title} ({items.length})
        </span>
        <Chevron open={open} />
      </button>
      {open &&
        (items.length === 0 ? (
          <p className="px-1 pb-2 text-sm text-fairway-700">{empty}</p>
        ) : (
          <ul className="flex flex-col gap-2 pt-1">
            {items.map((f) => (
              <li key={f.id}>
                <Result
                  finding={f}
                  tone={tone}
                  expanded={activeId === f.id}
                  onSelect={onSelect}
                  // Drills show on the first result with this issue; later ones point back to it.
                  drillsElsewhere={f.issue && drillsFirst.get(f.issue) !== f.id ? items.find((x) => x.id === drillsFirst.get(f.issue!))?.title : undefined}
                />
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}

const CONFIDENCE_STYLE = {
  high: "bg-white/80 text-fairway-700",
  medium: "bg-white/80 text-fairway-600",
  low: "bg-white/80 text-amber-800",
};

function Result({
  finding: f,
  tone,
  expanded,
  onSelect,
  drillsElsewhere,
}: {
  finding: Finding;
  tone: "good" | "improve";
  expanded: boolean;
  onSelect: (f: Finding | null) => void;
  drillsElsewhere?: string;
}) {
  const colors =
    tone === "good"
      ? { icon: "✓", badge: "bg-fairway-600", ring: "ring-fairway-500", bg: "bg-fairway-50 hover:bg-fairway-100" }
      : { icon: "→", badge: "bg-amber-500", ring: "ring-amber-400", bg: "bg-amber-50 hover:bg-amber-100" };

  return (
    <div className={`rounded-xl ${colors.bg} ${expanded ? `ring-2 ${colors.ring}` : ""}`}>
      <button
        onClick={() => onSelect(expanded ? null : f)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-2.5 p-3 text-left"
      >
        <span
          aria-hidden
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${colors.badge}`}
        >
          {colors.icon}
        </span>
        <span className="flex-1 text-sm font-semibold text-fairway-900">
          {f.severity && (
            <span
              className={`mr-1.5 inline-block rounded-full px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-white ${
                f.severity === "major" ? "bg-red-600" : "bg-amber-500"
              }`}
            >
              {f.severity}
            </span>
          )}
          {f.title}
          {f.confidence && (
            <span
              title="How sure the measurement is: how clearly your body was seen, how reliable this kind of reading is from video, and how close it is to the line between two verdicts."
              className={`ml-1.5 inline-block rounded-full px-1.5 py-0.5 align-middle text-[10px] font-semibold ${CONFIDENCE_STYLE[f.confidence]}`}
            >
              {f.confidence} confidence
            </span>
          )}
        </span>
        <Chevron open={expanded} small />
      </button>
      {expanded && (
        <div className="-mt-1 px-3 pb-3 pl-[2.875rem]">
          <p className="text-xs text-fairway-800">{f.meaning}</p>
          <p className="mt-1 text-xs text-fairway-600">{f.detail}</p>
          {f.related?.map((text) => (
            <p key={text} className="mt-1.5 rounded-lg bg-white/70 px-2 py-1 text-xs text-fairway-900">
              <span className="font-bold">Connected: </span>
              {text}
            </p>
          ))}
          {f.confidence === "low" && (
            <p className="mt-1 text-xs text-amber-800">
              Low confidence: treat this as a hint and check it on the video before working on it.
            </p>
          )}
          {/* Jumps again (e.g. after playing the video), pauses there and re-highlights the aid. */}
          <button
            onClick={() => onSelect(f)}
            className="-ml-2 mt-1 inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-fairway-700 underline-offset-2 hover:bg-white/70 hover:underline"
          >
            <span aria-hidden>▶</span> See it at {f.time.toFixed(2)}s
          </button>
          {f.issue && !drillsElsewhere && <HowToFix issue={f.issue} />}
          {drillsElsewhere && (
            <p className="mt-1 text-xs text-fairway-700">The drills for this are under &ldquo;{drillsElsewhere}&rdquo;.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Chevron({ open, small }: { open: boolean; small?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={`${small ? "mt-0.5 h-4 w-4" : "h-5 w-5"} shrink-0 text-fairway-700 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
