"use client";

import { IMPROVEMENTS, type Drill, type IssueKey, type TrainingAid } from "@/data/improvements";

// "How to fix it": drill videos and training aids for one issue. Drills with
// no YouTube ID yet show a search link instead of an embedded video, and aids
// with no product link yet link to a web search (see src/data/improvements.ts).
export default function HowToFix({ issue }: { issue: IssueKey }) {
  const { drills, aids } = IMPROVEMENTS[issue];
  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-amber-200 pt-3">
      <h4 className="text-xs font-bold uppercase tracking-wide text-fairway-800">How to fix it</h4>
      <ul className="flex flex-col gap-3">
        {drills.map((d) => (
          <li key={d.name}>
            <DrillCard drill={d} />
          </li>
        ))}
      </ul>

      <h4 className="text-xs font-bold uppercase tracking-wide text-fairway-800">Training aids that help</h4>
      <ul className="flex flex-col gap-2">
        {aids.map((a) => (
          <li key={a.name}>
            <AidCard aid={a} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DrillCard({ drill }: { drill: Drill }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-fairway-100">
      {drill.youtubeId ? (
        <iframe
          className="aspect-video w-full"
          src={`https://www.youtube-nocookie.com/embed/${drill.youtubeId}`}
          title={drill.name}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(drill.searchQuery)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex aspect-video w-full flex-col items-center justify-center gap-1 bg-fairway-900 text-white hover:bg-fairway-800"
        >
          <span aria-hidden className="flex h-10 w-14 items-center justify-center rounded-xl bg-red-600 text-lg">
            ▶
          </span>
          <span className="text-xs font-semibold">Find this drill on YouTube</span>
        </a>
      )}
      <div className="p-2.5">
        <p className="text-sm font-semibold text-fairway-900">{drill.name}</p>
        <p className="mt-0.5 text-xs text-fairway-800">{drill.how}</p>
        <p className="mt-1 text-xs font-semibold text-fairway-600">
          {drill.reps} · about {drill.minutes} min
        </p>
      </div>
    </div>
  );
}

function AidCard({ aid }: { aid: TrainingAid }) {
  const href = aid.url || `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(aid.searchQuery)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl bg-white p-2.5 ring-1 ring-fairway-100 hover:ring-fairway-300"
    >
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fairway-50 text-lg">
        🛒
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-fairway-900">{aid.name}</span>
        <span className="block text-xs text-fairway-700">{aid.howItHelps}</span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-fairway-600">{aid.url ? "View ↗" : "Shop ↗"}</span>
    </a>
  );
}
