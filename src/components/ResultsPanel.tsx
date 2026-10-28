"use client";

import { useState } from "react";
import type { Finding } from "@/lib/analysis/metrics";
import type { ShotMode } from "@/config/analysisConfig";
import { buildPracticePlan } from "@/lib/analysis/practicePlan";
import HowToFix from "./HowToFix";
import PracticePlanModal from "./PracticePlanModal";

type Props = {
  findings: Finding[];
  swingFound: boolean;
  activeId: string | null; // the expanded result
  onSelect: (finding: Finding | null) => void; // open a result, or close it (null)
  mode: ShotMode;
};

// "Areas to improve" and "Strengths" as collapsible sections. Each result shows
// just its badge and title; clicking it opens the details, jumps the video to
// that moment and highlights the matching aid. On computers the card fits the
// screen and scrolls inside itself.
export default function ResultsPanel({ findings, swingFound, activeId, onSelect, mode }: Props) {
  const [open, setOpen] = useState({ improve: true, strengths: false });
  const [showPlan, setShowPlan] = useState(false);
  const improve = findings.filter((f) => f.status === "improve");
  const strengths = findings.filter((f) => f.status === "strength");

  return (
    <div className="flex flex-col rounded-3xl bg-white shadow-sm lg:max-h-[calc(100svh-2rem)]">
      <div className="p-4 pb-2">
        <h2 className="font-bold text-fairway-900">Your results</h2>
        <p className="text-xs text-fairway-700">
          {swingFound
            ? "Biggest issues first. Click a result for details and to see it on the video."
            : "We couldn't spot a full swing in this clip, so there are no results yet. Make sure the whole swing is in the video, or drag the A / T / I markers on the scrubber."}
        </p>
        {swingFound && (
          <button
            onClick={() => setShowPlan(true)}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-fairway-700 text-sm font-semibold text-white hover:bg-fairway-800"
          >
            <span aria-hidden>📅</span> Build my practice plan
          </button>
        )}
      </div>
      {showPlan && <PracticePlanModal plan={buildPracticePlan(findings, mode)} onClose={() => setShowPlan(false)} />}

      {swingFound && (
        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto px-4 pb-4">
          <Section
            title="Areas to improve"
            tone="improve"
            items={improve}
            open={open.improve}
            onToggle={() => setOpen((o) => ({ ...o, improve: !o.improve }))}
            activeId={activeId}
            onSelect={onSelect}
            empty="Nothing to fix here. Nice swing!"
          />
          <Section
            title="Strengths"
            tone="good"
            items={strengths}
            open={open.strengths}
            onToggle={() => setOpen((o) => ({ ...o, strengths: !o.strengths }))}
            activeId={activeId}
            onSelect={onSelect}
            empty="Keep working. Your strengths will show up here."
          />
        </div>
      )}
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
  empty,
}: {
  title: string;
  tone: "good" | "improve";
  items: Finding[];
  open: boolean;
  onToggle: () => void;
  activeId: string | null;
  onSelect: (f: Finding | null) => void;
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
                <Result finding={f} tone={tone} expanded={activeId === f.id} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}

function Result({
  finding: f,
  tone,
  expanded,
  onSelect,
}: {
  finding: Finding;
  tone: "good" | "improve";
  expanded: boolean;
  onSelect: (f: Finding | null) => void;
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
        </span>
        <Chevron open={expanded} small />
      </button>
      {expanded && (
        <div className="-mt-1 px-3 pb-3 pl-[2.875rem]">
          <p className="text-xs text-fairway-800">{f.meaning}</p>
          <p className="mt-1 text-xs text-fairway-600">{f.detail}</p>
          <p className="mt-1 text-xs font-semibold text-fairway-600">▶ Shown on the video at {f.time.toFixed(2)}s</p>
          {f.issue && <HowToFix issue={f.issue} />}
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
