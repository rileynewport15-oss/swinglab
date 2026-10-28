"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { PracticePlan } from "@/lib/analysis/practicePlan";

type Props = {
  plan: PracticePlan;
  onClose: () => void;
};

const KIND_STYLE = {
  drills: { badge: "bg-fairway-600 text-white", label: "Drills" },
  range: { badge: "bg-sky-600 text-white", label: "Practice" },
  rest: { badge: "bg-fairway-100 text-fairway-700", label: "Rest" },
};

// The 7-day practice plan, shown in a pop-up card over the page.
export default function PracticePlanModal({ plan, onClose }: Props) {
  // Esc closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const total = plan.days.reduce((s, d) => s + d.minutes, 0);

  // Rendered on the page body so nothing (like the pinned video) can cover it.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-fairway-900/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your 7-day practice plan"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92svh] w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-fairway-100 p-4">
          <div>
            <h2 className="text-lg font-bold text-fairway-900">Your 7-day practice plan</h2>
            <p className="text-sm text-fairway-700">
              {plan.focus.length > 0
                ? `Focused on: ${plan.focus.join(", ")}`
                : "No areas to improve, so this plan keeps your game sharp."}
            </p>
            <p className="mt-1 text-xs font-semibold text-fairway-600">About {formatMinutes(total)} in total this week</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close practice plan"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-fairway-800 hover:bg-fairway-50"
          >
            ✕
          </button>
        </div>

        <ol className="flex flex-col gap-2 overflow-y-auto p-4">
          {plan.days.map((d) => (
            <li
              key={d.day}
              className={`rounded-2xl p-3 ${d.kind === "rest" ? "bg-fairway-50/60" : "bg-fairway-50"}`}
            >
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-sm font-bold text-fairway-900">Day {d.day}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${KIND_STYLE[d.kind].badge}`}>
                  {KIND_STYLE[d.kind].label}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fairway-900">{d.title}</span>
                <span className="shrink-0 text-xs font-semibold text-fairway-700">
                  {d.minutes > 0 ? formatMinutes(d.minutes) : "—"}
                </span>
              </div>
              <ul className="mt-2 flex flex-col gap-1 pl-14">
                {d.items.map((item, i) => (
                  <li key={i} className="text-xs text-fairway-800">
                    <span className="font-semibold">{item.name}</span>
                    {item.minutes > 0 && <span className="text-fairway-600"> · {item.minutes} min</span>}
                    <span className="block text-fairway-700">{item.detail}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </div>,
    document.body,
  );
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
