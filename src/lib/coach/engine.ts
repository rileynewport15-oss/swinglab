import { COACH_LINES, type CoachBank, type TalkKey } from "@/data/coachLines";
import { IMPROVEMENTS } from "@/data/improvements";
import type { Finding } from "@/lib/analysis/findings";
import type { Report } from "@/lib/analysis/report";
import type { CoachId } from "./coaches";
import type { ShotMode } from "@/config/analysisConfig";

// Builds what the coach says from the results and the line bank
// (src/data/coachLines.ts). No AI: the coach only ever says lines written for
// the results this swing actually produced, with its numbers filled in.

export type Question = "breakdown" | "first" | "well" | "drill" | "why" | "hype";

export const QUESTIONS: { id: Question; label: string }[] = [
  { id: "breakdown", label: "Give me the breakdown" },
  { id: "first", label: "What should I work on first?" },
  { id: "well", label: "What did I do well?" },
  { id: "drill", label: "Give me a drill" },
  { id: "why", label: "Why does this cause bad shots?" },
  { id: "hype", label: "Hype me up / roast me" },
];

/** What a conversation remembers, so the coach doesn't repeat itself. */
export type Memory = {
  used: Set<string>; // lines already said
  turns: Map<string, number>; // how many times each rotating answer has been given
};

export function newMemory(): Memory {
  return { used: new Set(), turns: new Map() };
}

const OPENING_MAX = 4;
const REPLY_MAX = 5;

export function opening(report: Report, mode: ShotMode, coach: CoachId, memory: Memory): string {
  return breakdown(new Talk(coach, mode, report, memory), true);
}

export function answer(question: Question, report: Report, mode: ShotMode, coach: CoachId, memory: Memory): string {
  const t = new Talk(coach, mode, report, memory);
  switch (question) {
    case "breakdown":
      return breakdown(t, false);
    case "first":
      return workOnFirst(t);
    case "well":
      return didWell(t);
    case "drill":
      return drill(t);
    case "why":
      return whyBadShots(t);
    case "hype":
      return hype(t);
  }
}

// ---------- Answers ----------
//
// Each answer is a list of pieces in speaking order. A piece's `rank` says how
// much it matters (0 = most): pieces are filled most important first, each
// choosing a line that fits the sentences left, so the substance always makes
// it in and the chit-chat only when there's room.

function breakdown(t: Talk, isOpening: boolean): string {
  const max = isOpening ? OPENING_MAX : REPLY_MAX;
  const focus = t.focus();
  const [strength, strength2] = t.strengths();
  if (!focus) {
    // Nothing (certain) to fix.
    const hint = t.issues()[0];
    return t.compose(max, [
      { rank: 2, say: (b) => t.talk(isOpening ? "openClean" : "breakdownIntro", {}, b) },
      { rank: 0, say: (b) => (strength ? t.result(strength, b) : null) },
      { rank: 4, say: (b) => (strength2 ? t.result(strength2, b) : null) },
      { rank: 1, say: (b) => (hint ? t.talk("onlyHints", { label: t.label(hint) }, b) : t.talk("breakdownClean", {}, b)) },
      { rank: 3, say: (b) => (isOpening ? t.talk("openClose", {}, b) : t.hidden(b)) },
    ]);
  }
  const second = t.issues().find((f) => f !== focus && f.confidence !== "low");
  // Coach Sunny always makes room for something good.
  const good = { rank: t.coach === "sunny" ? 1 : 2, say: (b: number) => (strength ? t.result(strength, b) : null) };
  const bad = { rank: 0, say: (b: number) => t.result(focus, b) };
  return t.compose(max, [
    { rank: t.coach === "sunny" ? 2 : 1, say: (b) => t.talk(isOpening ? "openIssues" : "breakdownIntro", {}, b) },
    // Coach Sunny leads with what's good; the others get straight to the problem.
    ...(t.coach === "sunny" ? [good, bad] : [bad, good]),
    isOpening
      ? { rank: 3, say: (b) => t.talk("openClose", {}, b) }
      : { rank: 3, say: (b) => (second ? t.joined(b, (r) => t.talk("alsoIssue", {}, r), (r) => t.result(second, r)) : null) },
    { rank: 4, say: (b) => (isOpening ? null : t.hidden(b)) },
  ]);
}

function workOnFirst(t: Talk): string {
  const focus = t.focus();
  if (!focus) {
    const hint = t.issues()[0];
    return t.compose(REPLY_MAX, [
      { rank: 0, say: (b) => (hint ? t.talk("onlyHints", { label: t.label(hint) }, b) : t.talk("noFocus", {}, b)) },
      { rank: 1, say: (b) => (hint ? t.result(hint, b) : null) },
    ]);
  }
  const effects = t.report.focus!.effects;
  return t.compose(REPLY_MAX, [
    { rank: 1, say: (b) => t.talk("focusIntro", { label: t.label(focus) }, b) },
    { rank: 0, say: (b) => t.result(focus, b) },
    { rank: 3, say: (b) => (effects.length ? t.talk("focusEffects", { effects: list(effects.map((f) => t.label(f))) }, b) : null) },
    { rank: 2, say: (b) => t.talk("cue", { cue: lowerFirst(t.report.focus!.cue) }, b) },
  ]);
}

function didWell(t: Talk): string {
  const strengths = t.strengths();
  if (strengths.length === 0) return t.compose(REPLY_MAX, [{ rank: 0, say: (b) => t.talk("noStrengths", {}, b) }]);
  // Each time it's asked, the next strengths in the list.
  const start = (t.turn("well") * 2) % strengths.length;
  const picks = [...new Set([strengths[start], strengths[(start + 1) % strengths.length]])];
  return t.compose(REPLY_MAX, [
    { rank: 2, say: (b) => t.talk("strengthsIntro", {}, b) },
    ...picks.map((f, i) => ({ rank: i, say: (b: number) => t.result(f, b) })),
  ]);
}

function drill(t: Talk): string {
  const issues = t.drillable();
  if (issues.length === 0) return t.compose(REPLY_MAX, [{ rank: 0, say: (b) => t.talk("noDrill", {}, b) }]);
  // The focus first, then the other issues; a new drill for it each time round.
  const n = t.turn("drill");
  const f = issues[n % issues.length];
  const drills = IMPROVEMENTS[f.issue!].drills;
  const d = drills[Math.floor(n / issues.length) % drills.length];
  return t.compose(REPLY_MAX, [
    { rank: 2, say: (b) => (f.confidence === "low" ? t.talk("lowConfidence", { label: t.label(f) }, b) : null) },
    { rank: 1, say: (b) => t.talk("drillIntro", { label: t.label(f), drill: `“${d.name}”` }, b) },
    { rank: 0, say: (b) => t.talk("drillBody", { how: d.how, reps: d.reps }, b) },
  ]);
}

function whyBadShots(t: Talk): string {
  const issues = t.drillable();
  if (issues.length === 0) return t.compose(REPLY_MAX, [{ rank: 0, say: (b) => t.talk("shotsNone", {}, b) }]);
  const f = issues[t.turn("why") % issues.length];
  return t.compose(REPLY_MAX, [
    { rank: 1, say: (b) => t.result(f, b) },
    { rank: 0, say: (b) => t.pick(t.bank.shots[f.issue!], {}, b) },
  ]);
}

function hype(t: Talk): string {
  const n = t.turn("hype");
  const strengths = t.strengths();
  const issues = t.issues();
  const at = <T,>(items: T[], i: number) => (items.length ? items[i % items.length] : undefined);
  // Sunny hypes with strengths, Sarge roasts the faults, The Caddie gives one of each.
  const middle =
    t.coach === "sunny"
      ? [at(strengths, n) ?? at(issues, n), at(strengths, n + 1)]
      : t.coach === "sarge"
        ? [at(issues, n) ?? at(strengths, n), at(issues, n + 1)]
        : [at(strengths, n), at(issues, n)];
  const said = [...new Set(middle.filter(Boolean) as Finding[])];
  return t.compose(REPLY_MAX, [
    { rank: 1, say: (b) => t.talk("hypeOpen", {}, b) },
    ...said.map((f, i) => ({ rank: i === 0 ? 0 : 3, say: (b: number) => t.result(f, b) })),
    { rank: 2, say: (b) => t.talk("hypeClose", {}, b) },
  ]);
}

// ---------- Picking and filling lines ----------

class Talk {
  bank: CoachBank;
  constructor(
    public coach: CoachId,
    public mode: ShotMode,
    public report: Report,
    private memory: Memory,
  ) {
    this.bank = COACH_LINES[coach];
  }

  /** Shown results that have coach lines. */
  issues = () => this.report.findings.filter((f) => f.status === "improve" && f.line);
  strengths = () => this.report.findings.filter((f) => f.status === "strength" && f.line);
  focus = () => (this.report.focus?.finding.line ? this.report.focus.finding : null);
  /** Issues with drills, the focus first. */
  drillable = () => {
    const focus = this.focus();
    const rest = this.issues().filter((f) => f !== focus && f.issue);
    const all = focus?.issue ? [focus, ...rest] : rest;
    return all.filter((f, i) => all.findIndex((g) => g.issue === f.issue) === i);
  };

  label = (f: Finding) => f.label ?? f.title.toLowerCase();

  turn(key: string) {
    const n = this.memory.turns.get(key) ?? 0;
    this.memory.turns.set(key, n + 1);
    return n;
  }

  // Every line picker takes a budget: the most sentences it may use.

  talk(key: TalkKey, vars: Record<string, string>, budget: number) {
    return this.pick(this.bank.talk[key], { shot: this.mode === "putt" ? "stroke" : "swing", ...vars }, budget);
  }

  /** The coach's line for a result, with a warning in front when it's low confidence. */
  result(f: Finding, budget: number): string | null {
    const say = (b: number) => this.pick(this.bank.results[f.line!.key], { ...f.line!.n, label: this.label(f) }, b);
    if (f.confidence !== "low") return say(budget);
    return this.joined(budget, (b) => this.talk("lowConfidence", { label: this.label(f) }, b), say) ;
  }

  hidden(budget: number) {
    const labels = this.report.hidden.map((f) => f.label ?? f.title.toLowerCase());
    return labels.length ? this.talk("hidden", { labels: list(labels) }, budget) : null;
  }

  /** Two lines said together, or nothing if they don't both fit. */
  joined(budget: number, first: (b: number) => string | null, second: (b: number) => string | null): string | null {
    // The second (the substance) is chosen first, then the lead-in in what's left.
    const b2 = second(budget - 1);
    if (!b2) return null;
    const b1 = first(budget - sentences(b2));
    return b1 === null ? null : [b1, b2].filter(Boolean).join(" ");
  }

  /**
   * A variation that fits the budget and hasn't been said yet in this
   * conversation (or any that fits, once all are used), filled in.
   * "" for a deliberately empty variation; null when none fits.
   */
  pick(options: string[], vars: Record<string, string>, budget: number): string | null {
    const filled = options
      .map((o) => fill(o, vars))
      .filter((o): o is string => o !== null && (o === "" || sentences(o) <= budget));
    if (filled.length === 0) return null;
    const fresh = filled.filter((o) => !this.memory.used.has(o));
    const pool = fresh.length ? fresh : filled;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    this.memory.used.add(choice);
    return choice;
  }

  /** Fill the pieces most important first within `max` sentences, then say them in order. */
  compose(max: number, pieces: Piece[]): string {
    const said: (string | null)[] = pieces.map(() => null);
    let left = max;
    pieces
      .map((p, i) => ({ ...p, i }))
      .sort((a, b) => a.rank - b.rank)
      .forEach((p) => {
        if (left <= 0) return;
        const text = p.say(left);
        if (text) {
          said[p.i] = text;
          left -= sentences(text);
        }
      });
    return said.filter(Boolean).join(" ");
  }
}

type Piece = { rank: number; say: (budget: number) => string | null };

/** Fill {words}; null if the line needs a number this result doesn't have. */
function fill(template: string, vars: Record<string, string>): string | null {
  let missing = false;
  const text = template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    if (v === undefined || v === "") missing = true;
    return v ?? "";
  });
  if (missing) return null;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function sentences(text: string) {
  if (!text) return 0;
  return Math.max(1, (text.match(/[.!?]+(?=\s|$)/g) ?? []).length);
}

function lowerFirst(s: string) {
  return /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}

function list(items: string[]) {
  const unique = [...new Set(items)];
  if (unique.length <= 1) return unique.join("");
  return `${unique.slice(0, -1).join(", ")} and ${unique.at(-1)}`;
}
