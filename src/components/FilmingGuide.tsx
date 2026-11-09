"use client";

import type { ShotMode } from "@/config/analysisConfig";

// "How to film": where to put the phone for each camera angle (seen from
// above), plus a few quick tips. Collapsed by default.
export default function FilmingGuide({ mode }: { mode: ShotMode }) {
  const tips = [
    { icon: "📱", title: "Phone at hip height", text: "Prop it on a bag or tripod, about 8–10 feet away, level with your belt." },
    { icon: "🧍", title: "Whole body in frame", text: `Head to feet${mode === "putt" ? ", plus the putter head" : " and the club at the top"}, with a little room on each side.` },
    { icon: "🐢", title: "Use slo-mo if you can", text: "More frames means sharper key moments. Normal video works too." },
    { icon: "✋", title: "Keep it still", text: "Don't follow the ball. Start recording before you set up and stop after your finish." },
  ];
  return (
    <details className="group rounded-3xl bg-white shadow-sm">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-3xl px-5 font-bold text-fairway-900 hover:bg-fairway-50 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <span aria-hidden>🎬</span> How to film your {mode === "putt" ? "putt" : "swing"}
        </span>
        <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-fairway-700 transition-transform group-open:rotate-180">
          <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="flex flex-col gap-5 px-5 pb-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <AngleCard
            view="down-the-line"
            title="Down the Line"
            text={mode === "putt" ? "Behind your hands, looking down the target line. Shows the stroke path and your eye line." : "Behind you, looking down the target line. Shows posture, swing plane and early extension."}
          />
          <AngleCard
            view="face-on"
            title="Face On"
            text={mode === "putt" ? "Facing your chest. Shows tempo, stroke length, the pendulum and head movement." : "Facing your chest. Shows sway, weight shift, spine tilt and sequence."}
          />
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {tips.map((t) => (
            <li key={t.title} className="flex gap-3 rounded-2xl bg-fairway-50 p-3">
              <span aria-hidden className="text-2xl leading-none">
                {t.icon}
              </span>
              <span>
                <span className="block text-sm font-semibold text-fairway-900">{t.title}</span>
                <span className="block text-xs text-fairway-700">{t.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-fairway-600">The app works out which angle you filmed from, so you don&apos;t need to tell it.</p>
      </div>
    </details>
  );
}

// Seen from above: the golfer, the ball, the target line and where the phone goes.
function AngleCard({ view, title, text }: { view: "down-the-line" | "face-on"; title: string; text: string }) {
  // Golfer at (60, 50), ball at (60, 78), target to the right.
  // Down the line: behind, on the target line. Face on: across the ball, facing the chest.
  const phone = view === "down-the-line" ? { x: 14, y: 78, rotate: 90 } : { x: 60, y: 100, rotate: 0 };
  const sightEnd = view === "down-the-line" ? { x: 50, y: 78 } : { x: 60, y: 60 };
  return (
    <div className="flex gap-3 rounded-2xl border border-fairway-100 p-3">
      <svg viewBox="0 0 120 112" className="h-32 w-36 shrink-0" role="img" aria-label={`${title}: camera position seen from above`}>
        {/* target line */}
        <line x1="8" y1="78" x2="112" y2="78" stroke="var(--color-fairway-200)" strokeWidth="2" strokeDasharray="4 3" />
        <path d="M106 74 L113 78 L106 82" fill="none" stroke="var(--color-fairway-500)" strokeWidth="2" />
        <text x="112" y="70" textAnchor="end" fontSize="9" fill="var(--color-fairway-600)">target</text>
        {/* golfer from above: feet, shoulders and head, facing the ball */}
        <rect x="45" y="56" width="7" height="12" rx="3" fill="var(--color-fairway-700)" />
        <rect x="68" y="56" width="7" height="12" rx="3" fill="var(--color-fairway-700)" />
        <ellipse cx="60" cy="50" rx="18" ry="8" fill="var(--color-fairway-100)" stroke="var(--color-fairway-600)" strokeWidth="1.5" />
        <circle cx="60" cy="50" r="5.5" fill="var(--color-fairway-600)" />
        <text x="60" y="36" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--color-fairway-800)">you</text>
        {/* ball */}
        <circle cx="60" cy="78" r="3.5" fill="white" stroke="var(--color-fairway-800)" strokeWidth="1.2" />
        {/* line of sight */}
        <line x1={phone.x} y1={phone.y} x2={sightEnd.x} y2={sightEnd.y} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2 2" />
        {/* phone */}
        <g transform={`translate(${phone.x} ${phone.y}) rotate(${phone.rotate})`}>
          <rect x="-6" y="-9" width="12" height="18" rx="2.5" fill="#f59e0b" />
          <circle cx="0" cy="-5" r="1.6" fill="white" />
        </g>
        <text
          x={view === "down-the-line" ? 14 : 84}
          y={view === "down-the-line" ? 98 : 104}
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          fill="#b45309"
        >
          phone
        </text>
      </svg>
      <div>
        <p className="text-sm font-bold text-fairway-900">{title}</p>
        <p className="mt-0.5 text-xs text-fairway-700">{text}</p>
      </div>
    </div>
  );
}
