"use client";

import type { ShotMode } from "@/config/analysisConfig";
import VideoUpload from "./VideoUpload";
import FilmingGuide from "./FilmingGuide";

type Props = {
  mode: ShotMode;
  onVideoSelected: (file: File) => void;
  onTrySample: () => void;
};

const STEPS = [
  { icon: "🎥", title: "Film your swing", text: "Any phone video, from down the line or face on." },
  { icon: "📊", title: "Get your analysis", text: "Key moments, what's working and what isn't, with your numbers." },
  { icon: "🎯", title: "Fix it with drills", text: "Drills, training aids and a 7-day plan for your biggest fault." },
];

const FEATURES = [
  { icon: "⏱️", title: "Key moments, found for you", text: "Address, top and impact (or setup, backstroke and impact) marked on the timeline." },
  { icon: "📐", title: "Training aids on your video", text: "Spine angle, swing plane, head box and more, drawn over your body." },
  { icon: "✅", title: "Honest confidence", text: "Every result says how sure it is, and unclear ones are hidden." },
  { icon: "📅", title: "A plan to fix it", text: "The one thing to work on first, a feel to try and a 7-day practice plan." },
];

const CHECKS: Record<ShotMode, { group: string; items: string[] }[]> = {
  "full-swing": [
    { group: "Down the line", items: ["Posture", "Takeaway", "Trail knee", "Lead arm", "Swing plane", "Early extension", "Head height"] },
    { group: "Face on", items: ["Hip sway", "Shoulder turn", "Spine tilt", "Sequence", "Weight shift", "Head position", "Release"] },
    { group: "Both", items: ["Tempo", "Finish balance"] },
  ],
  putt: [
    { group: "Face on", items: ["Tempo", "Stroke length", "Acceleration", "Wrists", "Shoulder rock", "Head", "Lower body"] },
    { group: "Down the line", items: ["Stroke path", "Eye line", "Head", "Lower body"] },
  ],
};

// The start page before a video is picked. Phones: the pitch, the upload card,
// how it works, the filming guide, what you get and what it checks. Computers:
// pitch and steps on the left, the upload card on the right, the rest below.
export default function Landing({ mode, onVideoSelected, onTrySample }: Props) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 lg:min-h-[calc(100svh-7rem)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:content-center lg:gap-x-12 lg:gap-y-8 lg:py-6">
      <section className="lg:col-start-1 lg:row-start-1 lg:self-end">
        <p className="text-xs font-bold uppercase tracking-widest text-fairway-600">Golf swing &amp; putting analysis</p>
        <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-fairway-900 lg:text-5xl">SwingLab</h2>
        <p className="mt-2 text-base text-fairway-800 lg:mt-4 lg:text-xl">
          Upload your swing. See what&apos;s working, what&apos;s not, and how to fix it.
        </p>
      </section>

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
        <VideoUpload mode={mode} onVideoSelected={onVideoSelected} onTrySample={onTrySample} />
      </div>

      <section aria-labelledby="how-it-works" className="lg:col-start-1 lg:row-start-2 lg:self-start">
        <h3 id="how-it-works" className="text-sm font-bold uppercase tracking-wide text-fairway-700">
          How it works
        </h3>
        <ol className="mt-3 grid gap-2 sm:grid-cols-3 lg:gap-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-sm sm:flex-col sm:gap-2 lg:p-4">
              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fairway-100 text-xl">
                {s.icon}
              </span>
              <span>
                <span className="block text-sm font-bold text-fairway-900">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.title}
                </span>
                <span className="mt-0.5 block text-xs text-fairway-700">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="lg:col-span-2">
        <FilmingGuide mode={mode} />
      </div>

      <section aria-labelledby="what-you-get" className="grid gap-4 lg:col-span-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6">
        <div>
          <h3 id="what-you-get" className="text-sm font-bold uppercase tracking-wide text-fairway-700">
            What you get
          </h3>
          <ul className="mt-3 grid grid-cols-2 gap-2 lg:gap-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="rounded-2xl bg-white/70 p-3 lg:p-4">
                <span aria-hidden className="text-xl">
                  {f.icon}
                </span>
                <span className="mt-1 block text-sm font-bold text-fairway-900">{f.title}</span>
                <span className="mt-0.5 block text-xs text-fairway-700">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-fairway-700">
            What it checks {mode === "putt" ? "in your putt" : "in your swing"}
          </h3>
          <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-white/70 p-4">
            {CHECKS[mode].map((c) => (
              <div key={c.group}>
                <p className="text-xs font-semibold text-fairway-600">{c.group}</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {c.items.map((item) => (
                    <li key={item} className="rounded-full bg-fairway-100 px-2.5 py-1 text-xs font-medium text-fairway-800">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
