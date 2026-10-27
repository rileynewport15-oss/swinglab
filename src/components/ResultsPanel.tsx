"use client";

import type { Finding } from "@/lib/analysis/metrics";

type Props = {
  findings: Finding[];
  swingFound: boolean;
  activeId: string | null;
  onSelect: (finding: Finding) => void;
};

// "Strengths" and "Areas to improve". Clicking a finding jumps the video to
// where it shows up and highlights the matching aid.
export default function ResultsPanel({ findings, swingFound, activeId, onSelect }: Props) {
  const strengths = findings.filter((f) => f.status === "strength");
  const improve = findings.filter((f) => f.status === "improve");

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-bold text-fairway-900">Your results</h2>
        <p className="text-xs text-fairway-700">
          {swingFound
            ? "Click a result to see it on the video."
            : "We couldn't spot a full swing in this clip, so there are no results yet. Make sure the whole swing is in the video, or drag the markers above the scrubber."}
        </p>
      </div>

      {swingFound && (
        <>
          <Section title="Strengths" icon="✓" tone="good" items={strengths} activeId={activeId} onSelect={onSelect}
            empty="Keep working. Your strengths will show up here." />
          <Section title="Areas to improve" icon="→" tone="improve" items={improve} activeId={activeId} onSelect={onSelect}
            empty="Nothing to fix here. Nice swing!" />
        </>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  tone,
  items,
  activeId,
  onSelect,
  empty,
}: {
  title: string;
  icon: string;
  tone: "good" | "improve";
  items: Finding[];
  activeId: string | null;
  onSelect: (f: Finding) => void;
  empty: string;
}) {
  const colors =
    tone === "good"
      ? { badge: "bg-fairway-600", ring: "ring-fairway-500", bg: "bg-fairway-50 hover:bg-fairway-100" }
      : { badge: "bg-amber-500", ring: "ring-amber-400", bg: "bg-amber-50 hover:bg-amber-100" };

  return (
    <section>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-fairway-800">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-fairway-700">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => onSelect(f)}
                aria-pressed={activeId === f.id}
                className={`flex w-full gap-3 rounded-xl p-3 text-left ${colors.bg} ${
                  activeId === f.id ? `ring-2 ${colors.ring}` : ""
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${colors.badge}`}
                >
                  {icon}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-fairway-900">{f.title}</span>
                  <span className="mt-0.5 block text-xs text-fairway-700">{f.detail}</span>
                  <span className="mt-1 block text-xs font-semibold text-fairway-600">
                    ▶ See it at {f.time.toFixed(2)}s
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
