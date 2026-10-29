import type { AidKind } from "../shapes";
import type { IssueKey } from "@/data/improvements";

// What every check returns, plus small helpers shared by the full swing and
// putting checks.

export type Severity = "minor" | "major";

export type Finding = {
  id: string;
  status: "strength" | "improve";
  severity?: Severity; // only for areas to improve
  title: string; // short, plain-language headline
  detail: string; // the numbers behind it
  meaning: string; // what it means and the ball flight it tends to cause
  time: number; // where in the video this shows up
  aid?: AidKind; // which training aid to highlight
  score: number; // how far past the threshold (for sorting the biggest issue first)
  issue?: IssueKey; // which drills and training aids fix it (see src/data/improvements.ts)
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

// ---------- Wording helpers ----------

/** "less than an inch", "about 1 inch", "about 2.5 inches" */
export function inches(value: number) {
  if (value < 1) return "less than an inch";
  const rounded = Math.round(value * 2) / 2;
  return `about ${rounded} ${rounded === 1 ? "inch" : "inches"}`;
}
