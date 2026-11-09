import { ANALYSIS_CONFIG, type ShotMode } from "@/config/analysisConfig";
import { CUES, type IssueKey } from "@/data/improvements";
import type { Confidence, Finding, PhaseId } from "./findings";

// Turns the raw check results into what the results card shows: a confidence
// level on each result (hiding ones too uncertain to trust), links between
// related issues, the one thing to work on first, a short summary, and how
// each phase of the swing went.

const C = ANALYSIS_CONFIG.confidence;

export type PhaseStatus = { id: PhaseId; name: string; time: number | null; status: "good" | "minor" | "major" | "none" };

export type Focus = { finding: Finding; why: string; cue: string };

export type Score = { value: number; label: string; sentence: string };

export type Report = {
  score: Score | null; // null when there are too few results to score
  findings: Finding[]; // shown, biggest issues first
  hidden: Finding[]; // too low confidence to show as results
  focus: Focus | null;
  summary: string;
  phases: PhaseStatus[];
};

export const PHASE_NAMES: Record<ShotMode, { id: PhaseId; name: string }[]> = {
  "full-swing": [
    { id: "setup", name: "Setup" },
    { id: "takeaway", name: "Takeaway" },
    { id: "top", name: "Top" },
    { id: "transition", name: "Transition" },
    { id: "downswing", name: "Downswing" },
    { id: "impact", name: "Impact" },
    { id: "finish", name: "Finish" },
  ],
  putt: [
    { id: "setup", name: "Setup" },
    { id: "backstroke", name: "Backstroke" },
    { id: "forward", name: "Forward stroke" },
    { id: "impact", name: "Impact" },
    { id: "finish", name: "Finish" },
  ],
};

type Input = {
  findings: Finding[];
  mode: ShotMode;
  pxPerInch: number;
  phaseTimes: Partial<Record<PhaseId, number | null>>;
};

export function buildReport({ findings, mode, pxPerInch, phaseTimes }: Input): Report {
  const rated = findings.map((f) => withConfidence(f, pxPerInch));
  const shown = rated.filter((f) => f.confidence !== undefined);
  const hidden = rated.filter((f) => f.confidence === undefined);
  const connected = connect(shown);
  const focus = pickFocus(connected);
  return {
    score: scoreOf(connected, focus, mode),
    findings: connected,
    hidden,
    focus,
    summary: summarize(connected, focus, mode),
    phases: PHASE_NAMES[mode].map(({ id, name }) => {
      const here = connected.filter((f) => f.phase === id);
      const status = here.length === 0
        ? "none"
        : here.some((f) => f.severity === "major")
          ? "major"
          : here.some((f) => f.status === "improve")
            ? "minor"
            : "good";
      return { id, name, time: phaseTimes[id] ?? null, status };
    }),
  };
}

// ---------- Confidence ----------

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** The lowest of: visibility, golfer size, the measurement's reliability, and distance from a threshold. */
function withConfidence(f: Finding, pxPerInch: number): Finding {
  if (!f.metric || !f.evidence) return { ...f, confidence: "medium", confidenceScore: 0.6 };
  const visibility = clamp((f.evidence.visibility - C.visibility.from) / (C.visibility.full - C.visibility.from));
  const size = clamp((pxPerInch - C.pixelsPerInch.from) / (C.pixelsPerInch.full - C.pixelsPerInch.from));
  const reliability = C.reliability[f.metric];
  const noise = C.noise[f.metric];
  const margin = C.onThreshold + (1 - C.onThreshold) * clamp(f.evidence.margin / noise);
  const score = Math.min(visibility, size, reliability, margin);
  const level: Confidence | undefined =
    score >= C.levels.high ? "high" : score >= C.levels.medium ? "medium" : score >= C.levels.low ? "low" : undefined;
  return { ...f, confidence: level, confidenceScore: score };
}

// ---------- Connecting related issues ----------

/**
 * When a cause and its likely effect are both issues, say so on both, so the
 * golfer works on the cause instead of chasing two separate problems.
 * `causeIssue` / `effectIssue` narrow a link to one kind of issue (e.g. a
 * rushed backswing, not a slow downswing). `text` is shown on the effect.
 */
type Link = { cause: string; effect: string; causeIssue?: IssueKey; effectIssue?: IssueKey; text: string };
const LINKS: Link[] = [
  // Full swing, down the line
  { cause: "early-extension", effect: "plane", effectIssue: "under-plane", text: "Your early extension is likely why your hands get stuck under plane: as your hips move toward the ball, your arms lose the room to swing down in front of you." },
  { cause: "early-extension", effect: "plane", effectIssue: "over-the-top", text: "Your early extension and the over-the-top move feed each other: with the hips moving toward the ball, the arms have to swing out over it to make room." },
  { cause: "posture", effect: "early-extension", text: "Your setup posture is likely part of why you stand up: from that starting position it's hard to hold your angles through the ball." },
  { cause: "trail-knee", effect: "early-extension", text: "Your trail knee straightening going back is likely feeding the early extension: it lets the hips rise, and they thrust toward the ball coming down." },
  { cause: "takeaway", effect: "plane", text: "Your takeaway is likely why the downswing path is off: the club starts off plane, and the downswing has to reroute it." },
  { cause: "tempo", effect: "plane", causeIssue: "tempo-rushed", text: "Your quick backswing is likely why you come off plane: the arms outrun the body and get thrown from the top." },
  { cause: "early-extension", effect: "finish", text: "Your early extension is likely why the finish is unsteady: standing up through impact throws your balance toward the ball." },
  // Face on
  { cause: "hips", effect: "reverse-tilt", text: "Your hip sway is likely causing the reverse tilt: as the hips slide away from the target, the upper body tips toward it." },
  { cause: "reverse-tilt", effect: "head", text: "The reverse tilt at the top is likely why your head moves: leaning toward the target going back makes the upper body lunge on the way down." },
  { cause: "reverse-tilt", effect: "weight", text: "The reverse tilt at the top is likely why your weight stays back: having leaned toward the target going back, your body falls away from it coming down." },
  { cause: "shoulder-turn", effect: "sequencing", text: "Your short shoulder turn is likely why the arms start the downswing: without a full turn there's nothing for the hips to unwind first." },
  { cause: "sequencing", effect: "release", text: "Starting down with the arms is likely why your lead arm folds: they arrive early and have to pull in after impact." },
  { cause: "weight", effect: "finish", text: "Your weight staying back through impact is likely why you can't finish over your lead foot." },
  { cause: "tempo", effect: "sequencing", causeIssue: "tempo-rushed", text: "Your quick backswing is likely why the hips don't lead: there's no time for them to start first." },
  // Putting
  { cause: "shoulders", effect: "triangle", text: "Your arms doing the work is likely why the triangle breaks down: when the shoulders aren't rocking, the hands and wrists swing the putter." },
  { cause: "acceleration", effect: "stroke-length", text: "Your short follow-through is the deceleration showing: the putter slows down into the ball and stops early." },
  { cause: "tempo", effect: "acceleration", text: "Your stroke rhythm is likely why the putter slows down: the forward stroke runs out of speed before the ball." },
  { cause: "lower-body", effect: "head", text: "Your lower body moving is likely why your head moves: the head goes where the body goes." },
  { cause: "eyes", effect: "path", text: "Your eye position is likely part of the path problem: the line you see from there isn't the line you swing on." },
];

function linkApplies(link: Link, cause: Finding | undefined, effect: Finding | undefined): boolean {
  return Boolean(
    cause && effect &&
    (!link.causeIssue || cause.issue === link.causeIssue) &&
    (!link.effectIssue || effect.issue === link.effectIssue),
  );
}

function connect(findings: Finding[]): Finding[] {
  const byId = new Map(findings.filter((f) => f.status === "improve").map((f) => [f.id, f]));
  const notes = new Map<string, string[]>();
  const add = (id: string, text: string) => notes.set(id, [...(notes.get(id) ?? []), text]);
  for (const link of LINKS) {
    const cause = byId.get(link.cause);
    const effect = byId.get(link.effect);
    if (!linkApplies(link, cause, effect)) continue;
    add(effect!.id, link.text);
    add(cause!.id, `Fixing this should also help ${effect!.label ?? "another result"}, which it's likely causing.`);
  }
  return findings.map((f) => (notes.has(f.id) ? { ...f, related: notes.get(f.id) } : f));
}

/** How many other issues an issue is likely causing. */
function effectsOf(f: Finding, findings: Finding[]): Finding[] {
  const issue = (id: string) => findings.find((x) => x.id === id && x.status === "improve");
  return LINKS.filter((l) => l.cause === f.id && linkApplies(l, f, issue(l.effect))).map((l) => issue(l.effect)!);
}

function causedBy(f: Finding, findings: Finding[]) {
  const issue = (id: string) => findings.find((x) => x.id === id && x.status === "improve");
  return LINKS.some((l) => l.effect === f.id && linkApplies(l, issue(l.cause), f));
}

// ---------- Focus on this first ----------

/**
 * The one issue that will help the most: a root cause before its effects,
 * major before minor, more confident before less (low confidence never).
 */
function pickFocus(findings: Finding[]): Focus | null {
  // A low-confidence hint is never the number-one priority.
  const issues = findings.filter((f) => f.status === "improve" && f.issue && f.confidence !== "low");
  if (issues.length === 0) return null;
  const value = (f: Finding) =>
    (f.severity === "major" ? 2 : 1) *
    (1 + 0.6 * effectsOf(f, findings).length) *
    (causedBy(f, findings) ? 0.6 : 1) *
    (f.confidence === "high" ? 1 : f.confidence === "medium" ? 0.75 : 0.45) *
    Math.min(f.score, 3);
  const best = issues.reduce((a, b) => (value(b) > value(a) ? b : a));
  const effects = [...new Set(effectsOf(best, findings).map((f) => f.title))];
  const why =
    best.meaning +
    (effects.length
      ? ` It's also the likely cause of ${effects.length === 1 ? "another issue below" : `${effects.length} other issues below`} (${effects.join("; ")}), so fixing it should improve more than one thing.`
      : "");
  return { finding: best, why, cue: CUES[best.issue!] };
}

// ---------- Score ----------

/** 100 minus points for each area to improve (see `score` in analysisConfig.ts). */
function scoreOf(findings: Finding[], focus: Focus | null, mode: ShotMode): Score | null {
  const S = ANALYSIS_CONFIG.score;
  if (findings.length < S.minResults) return null;
  const issues = findings.filter((f) => f.status === "improve");
  const lost = issues.reduce((sum, f) => {
    const points = S.penalty[f.severity ?? "minor"] * S.confidenceWeight[f.confidence ?? "low"];
    return sum + points * (causedBy(f, findings) ? S.linkedIssueShare : 1);
  }, 0);
  // Strengths close enough to their limit that they could have gone either way.
  const borderline = findings
    .filter((f) => f.status === "strength" && f.metric && f.evidence && Number.isFinite(f.evidence.margin))
    .reduce((sum, f) => sum + S.borderline.points * (1 - clamp(f.evidence!.margin / C.noise[f.metric!] / S.borderline.withinNoise)), 0);
  const value = Math.max(S.lowest, Math.round(100 - lost - borderline));
  const label = S.bands.find((b) => value >= b.min)!.label;
  const what = mode === "putt" ? "stroke" : "swing";
  const strengths = findings.length - issues.length;
  const good = `${strengths} ${strengths === 1 ? "thing" : "things"} working`;
  const majors = issues.filter((f) => f.severity === "major").length;
  const minors = issues.length - majors;
  const counts = [
    majors ? `${majors} major ${majors === 1 ? "issue" : "issues"}` : null,
    minors ? `${minors} minor ${minors === 1 ? "issue" : "issues"}` : null,
  ].filter(Boolean) as string[];
  const lead = focus ? ` (start with ${focus.finding.label ?? lowerFirst(focus.finding.title)})` : "";
  const sentence =
    issues.length === 0
      ? `${label} ${what}: ${good} and nothing clear to fix.`
      : `${label} ${what}: ${good}, with ${list(counts)} to work on${lead}.`;
  return { value, label, sentence };
}

// ---------- Summary ----------

function summarize(findings: Finding[], focus: Focus | null, mode: ShotMode): string {
  const what = mode === "putt" ? "stroke" : "swing";
  const strengths = findings
    .filter((f) => f.status === "strength" && f.confidence !== "low" && f.label)
    .sort((a, b) => (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0))
    .slice(0, 2)
    .map((f) => f.label!);
  const issues = findings.filter((f) => f.status === "improve");
  const first = strengths.length ? `${cap(list(strengths))} ${strengths.length > 1 ? "are" : "is"} solid.` : "";
  if (!focus) {
    const hints = issues.length;
    return (
      `${first} Nothing in this ${what} stands out as a clear problem` +
      (hints
        ? `; ${hints === 1 ? "the one result below is a low-confidence hint" : `the ${hints} results below are low-confidence hints`} worth checking on the video.`
        : ", so keep grooving it and check back with a new video.")
    ).trim();
  }
  const others = issues.length - 1;
  // "Early extension: you stood up 8°" reads better as "early extension (you stood up 8°)".
  const [head, ...rest] = focus.finding.title.split(": ");
  const named = rest.length ? `${lowerFirst(head)} (${rest.join(": ")})` : lowerFirst(focus.finding.title);
  const main = `Biggest thing to fix: ${named}.`;
  const helped = effectsOf(focus.finding, findings).length;
  const next =
    others > 0
      ? `Work on that first. ${others === 1 ? "There's one smaller thing below" : `There are ${others} smaller things below`}${
          helped ? `, and ${helped === others ? (others === 1 ? "it" : "they") : helped === 1 ? "one of them" : "some of them"} should improve along with it` : ""
        }.`
      : `Fix that and this ${what} has no other clear problems.`;
  return [first, main, next].filter(Boolean).join(" ");
}

function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function cap(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function lowerFirst(s: string) {
  // Keep "I" and abbreviations as they are; lower the first word otherwise.
  return /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}
