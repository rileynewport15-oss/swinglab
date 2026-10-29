import { IMPROVEMENTS, type Drill, type IssueKey } from "@/data/improvements";
import type { ShotMode } from "@/config/analysisConfig";
import type { Finding } from "./findings";

export type PlanItem = { name: string; detail: string; minutes: number };

export type PlanDay = {
  day: number;
  kind: "drills" | "range" | "rest";
  title: string;
  minutes: number;
  items: PlanItem[];
};

export type PracticePlan = {
  focus: string[]; // plain names of the issues the plan works on
  days: PlanDay[];
};

const MAX_FOCUS = 3;

/**
 * A 7-day plan built around the golfer's biggest issues (up to 3): drill days,
 * range or practice-green sessions, and rest. Results are already sorted
 * biggest issue first, so the first issues get the most time.
 */
export function buildPracticePlan(findings: Finding[], mode: ShotMode): PracticePlan {
  const issues: IssueKey[] = [];
  for (const f of findings) {
    if (f.status === "improve" && f.issue && !issues.includes(f.issue)) issues.push(f.issue);
  }
  const focus = issues.slice(0, MAX_FOCUS);
  const putt = mode === "putt";
  const venue = putt ? "Practice green" : "Range session";

  if (focus.length === 0) {
    return { focus: [], days: maintenancePlan(putt) };
  }

  // With fewer than 3 issues, the first one gets the extra days.
  const [a, b = focus[0], c = focus[1] ?? focus[0]] = focus;
  const drills = (issue: IssueKey) => IMPROVEMENTS[issue].drills;
  const name = (issue: IssueKey) => IMPROVEMENTS[issue].issue;
  // Short name for sentences: "Early extension (standing up)" → "early extension".
  const short = (issue: IssueKey) => name(issue).replace(/\s*\(.*\)$/, "").toLowerCase();
  const drillItem = (d: Drill): PlanItem => ({ name: d.name, detail: d.reps, minutes: d.minutes });
  const warmUp: PlanItem = {
    name: "Warm-up",
    detail: putt ? "A few easy putts of different lengths" : "Stretch, then 10 easy half swings with a wedge",
    minutes: 10,
  };
  const balls = (issue: IssueKey): PlanItem => ({
    name: putt ? "Putts with a focus" : "Balls with a focus",
    detail: putt
      ? `20 putts from 6–20 feet, rehearsing the feel for ${short(issue)} before each one`
      : `30 balls, making a slow rehearsal swing for ${short(issue)} before each one`,
    minutes: 25,
  });
  const recheck: PlanItem = {
    name: "Film and re-check",
    detail: "Film from the same camera angle and upload it to SwingLab to see what changed",
    minutes: 10,
  };

  const days: Omit<PlanDay, "minutes">[] = [
    { day: 1, kind: "drills", title: `Drills: ${name(a)}`, items: drills(a).slice(0, 2).map(drillItem) },
    { day: 2, kind: "drills", title: `Drills: ${name(b)}`, items: drills(b).slice(0, 2).map(drillItem) },
    { day: 3, kind: "rest", title: "Rest", items: [restItem(putt)] },
    {
      day: 4,
      kind: "range",
      title: `${venue}: ${name(a)}`,
      items: [warmUp, drillItem(drills(a)[0]), balls(a)],
    },
    {
      day: 5,
      kind: "drills",
      title: `Drills: ${name(c)}`,
      items: drills(c).slice(0, 2).map(drillItem),
    },
    {
      day: 6,
      kind: "range",
      title: `${venue}: put it together`,
      items: [warmUp, drillItem(drills(b)[0]), balls(c === a ? b : c), recheck],
    },
    { day: 7, kind: "rest", title: "Rest", items: [restItem(putt)] },
  ];

  return { focus: focus.map(name), days: withTotals(days) };
}

function restItem(putt: boolean): PlanItem {
  return {
    name: "Rest day",
    detail: putt
      ? "Optional: 5 minutes of putting strokes in front of a mirror at home"
      : "Optional: 10 minutes of hip and shoulder mobility stretches",
    minutes: 0,
  };
}

// No areas to improve: keep the good habits with lighter, varied practice.
function maintenancePlan(putt: boolean): PlanDay[] {
  const venue = putt ? "Practice green" : "Range session";
  const play: PlanItem = {
    name: putt ? "Random putts" : "Play the course on the range",
    detail: putt
      ? "Putt one ball from 10 different spots, reading each putt as if it counted"
      : "Hit 30 balls changing club and target every shot, with your full routine",
    minutes: 30,
  };
  return withTotals([
    { day: 1, kind: "range", title: `${venue}: keep it sharp`, items: [play] },
    { day: 2, kind: "rest", title: "Rest", items: [restItem(putt)] },
    { day: 3, kind: "range", title: `${venue}: keep it sharp`, items: [play] },
    { day: 4, kind: "rest", title: "Rest", items: [restItem(putt)] },
    { day: 5, kind: "range", title: `${venue}: pressure practice`, items: [play] },
    { day: 6, kind: "rest", title: "Rest", items: [restItem(putt)] },
    { day: 7, kind: "rest", title: "Rest", items: [restItem(putt)] },
  ]);
}

function withTotals(days: Omit<PlanDay, "minutes">[]): PlanDay[] {
  return days.map((d) => ({ ...d, minutes: d.items.reduce((s, i) => s + i.minutes, 0) }));
}
