import { ANALYSIS_CONFIG } from "@/config/analysisConfig";
import type { AidKind } from "../shapes";
import type { IssueKey } from "@/data/improvements";

// What every check returns, plus small helpers shared by the full swing and
// putting checks.

export type Severity = "minor" | "major";
export type Confidence = "high" | "medium" | "low";
export type MetricKey = keyof typeof ANALYSIS_CONFIG.confidence.reliability;

// Full swing: setup → takeaway → top → transition → downswing → impact → finish.
// Putt: setup → backstroke → transition → forward → impact → finish.
export type PhaseId = "setup" | "takeaway" | "top" | "transition" | "downswing" | "impact" | "finish" | "backstroke" | "forward";

export type Finding = {
  id: string;
  status: "strength" | "improve";
  severity?: Severity; // only for areas to improve
  title: string; // short, plain-language headline
  detail: string; // the numbers behind it
  meaning: string; // what it means for this golfer and the shots it tends to cause
  time: number; // where in the video this shows up
  aid?: AidKind; // which training aid to highlight
  score: number; // how far past the threshold (for sorting the biggest issue first)
  issue?: IssueKey; // which drills and training aids fix it (see src/data/improvements.ts)
  phase?: PhaseId; // which part of the swing (none = the whole swing, like tempo)
  label?: string; // a few words for summaries, e.g. "early extension"
  metric?: MetricKey;
  // What the confidence is worked out from (see rate() and report.ts).
  evidence?: { visibility: number; margin: number };
  confidence?: Confidence;
  confidenceScore?: number;
  related?: string[]; // sentences linking this result to others
};

/** Grade a "bigger is worse" value: null = fine, else the severity. */
export function grade(value: number, limits: { minor: number; major: number }): Severity | null {
  if (value > limits.major) return "major";
  if (value > limits.minor) return "minor";
  return null;
}

export function strength(id: string, title: string, detail: string, meaning: string, time: number, aid?: AidKind): Finding {
  return { id, status: "strength", title, detail, meaning, time, aid, score: 0 };
}

/** Tag an area to improve with the issue it is, so we can suggest drills. */
export function withIssue(issue: IssueKey, finding: Finding): Finding {
  return { ...finding, issue };
}

export function issue(
  id: string,
  severity: Severity,
  score: number,
  title: string,
  detail: string,
  meaning: string,
  time: number,
  aid?: AidKind,
): Finding {
  return { id, status: "improve", severity, title, detail, meaning, time, aid, score };
}

export type Rating = {
  phase?: PhaseId;
  label: string;
  metric: MetricKey;
  visibility: number; // average MediaPipe confidence in the points used
  value: number; // the reading
  // The limits between "strength" and "area to improve". (Not minor vs major:
  // confidence is about whether the verdict could flip, and a reading near the
  // major line is still clearly an issue.)
  thresholds: number[];
};

/** Attach what the confidence and the summary need to a result. */
export function rate(r: Rating, finding: Finding): Finding {
  const margin = r.thresholds.length ? Math.min(...r.thresholds.map((t) => Math.abs(r.value - t))) : Infinity;
  return { ...finding, phase: r.phase, label: r.label, metric: r.metric, evidence: { visibility: r.visibility, margin } };
}

/** Average confidence MediaPipe gave the points in these poses (0–1). */
export function visibilityOf(poses: { visibility: number }[][], points: number[]): number {
  const values = poses.flatMap((lms) => points.map((i) => lms[i].visibility));
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

// Wrist and knuckle of each hand (MediaPipe numbers).
const LEFT_HAND = [15, 19];
const RIGHT_HAND = [16, 20];

/**
 * How well the hands were seen. The hands hold the club together, so the
 * better-seen one counts: from down the line the far hand is always hidden
 * behind the near one, which would otherwise halve every hand score.
 */
export function handsVisibility(poses: { visibility: number }[][]): number {
  if (poses.length === 0) return 0;
  return poses.reduce((s, lms) => s + Math.max(visibilityOf([lms], LEFT_HAND), visibilityOf([lms], RIGHT_HAND)), 0) / poses.length;
}

// ---------- Wording helpers ----------

/** "less than an inch", "about 1 inch", "about 2.5 inches" */
export function inches(value: number) {
  if (value < 1) return "less than an inch";
  const rounded = Math.round(value * 2) / 2;
  return `about ${rounded} ${rounded === 1 ? "inch" : "inches"}`;
}

/** "about 2.5 in" (short, for titles) */
export function inchesShort(value: number) {
  if (value < 1) return "under 1 in";
  return `${Math.round(value * 2) / 2} in`;
}
