import type { ShotMode } from "@/config/analysisConfig";
import type { Finding } from "@/lib/analysis/findings";
import type { Report } from "@/lib/analysis/report";
import type { CameraAngle } from "@/lib/pose/autoAids";
import { IMPROVEMENTS } from "@/data/improvements";

// The one-page report a golfer can send to a coach: a key frame with the aids
// drawn on it, the score, the top issues and the drills for them. Drawn on a
// canvas in the browser and saved as a PNG (nothing is uploaded).

type Input = {
  report: Report;
  mode: ShotMode;
  angle: CameraAngle;
  frame: HTMLCanvasElement; // the key frame, aids included
  frameTime: number;
  frameCaption: string;
};

const W = 1200;
const PAD = 48;
const GREEN = { 50: "#eef8f1", 100: "#d6eedd", 600: "#237247", 700: "#1b5a38", 800: "#14432a", 900: "#0d2e1d" };
const AMBER = "#f59e0b";
const RED = "#dc2626";

/** The key frame: the video picture with every overlay canvas in the stage drawn on top. */
export function captureStage(stage: HTMLElement, video: HTMLVideoElement): HTMLCanvasElement {
  const w = video.videoWidth;
  const h = video.videoHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, w, h);
  // The stage has the video's shape, so each overlay stretches to the same box.
  for (const layer of stage.querySelectorAll("canvas")) {
    if (layer.width > 0 && layer.height > 0) ctx.drawImage(layer, 0, 0, w, h);
  }
  return canvas;
}

/** Draw the report and start the download. */
export async function downloadReportImage(input: Input): Promise<void> {
  const canvas = drawReport(input);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Couldn't make the image");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  a.download = `swinglab-${input.mode === "putt" ? "putt" : "swing"}-report-${date}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function drawReport({ report, mode, angle, frame, frameTime, frameCaption }: Input): HTMLCanvasElement {
  const font = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  // Drawn on a tall canvas, then cropped to the height actually used.
  const draft = document.createElement("canvas");
  draft.width = W;
  draft.height = 4000;
  const ctx = draft.getContext("2d")!;
  const f = (size: number, weight = 400) => `${weight} ${size}px ${font}`;
  ctx.fillStyle = GREEN[50];
  ctx.fillRect(0, 0, W, draft.height);
  ctx.textBaseline = "top";

  // Header
  ctx.fillStyle = GREEN[800];
  ctx.fillRect(0, 0, W, 112);
  ctx.fillStyle = "#ffffff";
  ctx.font = f(36, 800);
  ctx.fillText("SwingLab report", PAD, 28);
  ctx.font = f(20);
  ctx.fillStyle = GREEN[100];
  const what = `${mode === "putt" ? "Putt" : "Full swing"} · ${angle === "face-on" ? "Face On" : "Down the Line"} · ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`;
  ctx.fillText(what, PAD, 74);

  // Left: the key frame
  const top = 112 + PAD;
  const frameW = 440;
  const frameH = Math.min(780, (frame.height / frame.width) * frameW);
  const drawW = (frame.width / frame.height) * frameH;
  roundRect(ctx, PAD, top, drawW, frameH, 20);
  ctx.save();
  ctx.clip();
  ctx.drawImage(frame, PAD, top, drawW, frameH);
  ctx.restore();
  ctx.fillStyle = GREEN[700];
  ctx.font = f(17, 600);
  let leftY = top + frameH + 12;
  leftY = wrap(ctx, `At ${frameTime.toFixed(2)}s: ${frameCaption}`, PAD, leftY, drawW, 24);

  // Right: score, focus, issues, strengths
  const x = PAD + drawW + 40;
  const colW = W - x - PAD;
  let y = top;
  if (report.score) {
    const s = report.score;
    const color = s.value >= 75 ? GREEN[600] : s.value >= 60 ? AMBER : RED;
    const cx = x + 56;
    const cy = y + 56;
    ctx.lineWidth = 14;
    ctx.strokeStyle = GREEN[100];
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, 48, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * s.value) / 100);
    ctx.stroke();
    ctx.fillStyle = GREEN[900];
    ctx.font = f(38, 800);
    ctx.textAlign = "center";
    ctx.fillText(String(s.value), cx, cy - 20);
    ctx.textAlign = "left";
    ctx.font = f(28, 800);
    ctx.fillText(s.label, x + 130, y + 14);
    ctx.font = f(18);
    ctx.fillStyle = GREEN[800];
    y = Math.max(wrap(ctx, s.sentence, x + 130, y + 52, colW - 130, 25), y + 120) + 16;
  }

  const focus = report.focus;
  if (focus) {
    const boxTop = y;
    ctx.font = f(17);
    const inner = colW - 40;
    // Measure first, then draw the box behind the text.
    const textH = measureWrap(ctx, focus.finding.title, inner, 26, f(21, 700)) + measureWrap(ctx, `Try this feel: ${focus.cue}`, inner, 24, f(17)) + 46;
    ctx.fillStyle = "#fffbeb";
    roundRect(ctx, x, boxTop, colW, textH, 16);
    ctx.fill();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#92400e";
    ctx.font = f(14, 800);
    ctx.fillText("FOCUS ON THIS FIRST", x + 20, boxTop + 16);
    ctx.fillStyle = GREEN[900];
    ctx.font = f(21, 700);
    let fy = wrap(ctx, focus.finding.title, x + 20, boxTop + 40, inner, 26);
    ctx.font = f(17);
    fy = wrap(ctx, `Try this feel: ${focus.cue}`, x + 20, fy + 6, inner, 24);
    y = Math.max(fy, boxTop + textH) + 24;
  }

  const issues = report.findings.filter((x) => x.status === "improve");
  const strengths = report.findings.filter((x) => x.status === "strength");
  y = heading(ctx, f, issues.length ? "Top issues" : "Areas to improve", x, y);
  if (issues.length === 0) {
    ctx.font = f(17);
    ctx.fillStyle = GREEN[800];
    y = wrap(ctx, `Nothing clear to fix in this ${mode === "putt" ? "stroke" : "swing"}.`, x, y, colW, 24) + 12;
  }
  for (const issue of issues.slice(0, 3)) y = resultLine(ctx, f, issue, x, y, colW) + 10;
  if (issues.length > 3) {
    ctx.font = f(15);
    ctx.fillStyle = GREEN[700];
    ctx.fillText(`+ ${issues.length - 3} more in the app`, x, y);
    y += 26;
  }
  y = heading(ctx, f, "Strengths", x, y + 8);
  ctx.font = f(17);
  ctx.fillStyle = GREEN[800];
  for (const s of strengths.slice(0, 5)) y = wrap(ctx, `✓ ${s.title}`, x, y, colW, 25) + 4;
  if (strengths.length === 0) y = wrap(ctx, "None measured clearly in this video.", x, y, colW, 25);

  // Full width: drills for the top issues (one per issue)
  y = Math.max(y, leftY) + 28;
  // Up to three cards: the first drill for each top issue, then their second
  // drills if there are fewer than three issues.
  // Low-confidence hints only get drills when there's nothing surer to work on.
  const sure = issues.filter((i) => i.confidence !== "low");
  const drillIssues = [...new Set((sure.length ? sure : issues).map((i) => i.issue).filter(Boolean))] as NonNullable<Finding["issue"]>[];
  const cards: { issue: string; drill: (typeof IMPROVEMENTS)[keyof typeof IMPROVEMENTS]["drills"][number] }[] = [];
  for (let round = 0; round < 3 && cards.length < 3; round++) {
    for (const key of drillIssues) {
      const drill = IMPROVEMENTS[key].drills[round];
      if (drill && cards.length < 3) cards.push({ issue: IMPROVEMENTS[key].issue, drill });
    }
  }
  if (cards.length) {
    y = heading(ctx, f, "Recommended drills", PAD, y);
    const gap = 20;
    const cardW = (W - PAD * 2 - gap * (cards.length - 1)) / cards.length;
    const heights = cards.map(
      (c) =>
        24 +
        measureWrap(ctx, c.issue.toUpperCase(), cardW - 36, 20, f(13, 800)) +
        measureWrap(ctx, c.drill.name, cardW - 36, 26, f(20, 700)) +
        measureWrap(ctx, c.drill.how, cardW - 36, 23, f(16)) +
        40,
    );
    const cardH = Math.max(...heights);
    cards.forEach((c, i) => {
      const cx = PAD + i * (cardW + gap);
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, cx, y, cardW, cardH, 16);
      ctx.fill();
      let cy = y + 18;
      ctx.fillStyle = GREEN[600];
      ctx.font = f(13, 800);
      cy = wrap(ctx, c.issue.toUpperCase(), cx + 18, cy, cardW - 36, 20);
      ctx.fillStyle = GREEN[900];
      ctx.font = f(20, 700);
      cy = wrap(ctx, c.drill.name, cx + 18, cy + 4, cardW - 36, 26);
      ctx.fillStyle = GREEN[800];
      ctx.font = f(16);
      cy = wrap(ctx, c.drill.how, cx + 18, cy + 4, cardW - 36, 23);
      ctx.fillStyle = GREEN[700];
      ctx.font = f(15, 600);
      ctx.fillText(c.drill.reps, cx + 18, cy + 8);
    });
    y += cardH + 28;
  }

  // Footer
  ctx.fillStyle = GREEN[700];
  ctx.font = f(14);
  y = wrap(
    ctx,
    "Measured by SwingLab from one phone video with pose detection. It sees body positions and timing, not the club face, ball flight or contact. Results marked low confidence are hints worth checking on the video.",
    PAD,
    y,
    W - PAD * 2,
    20,
  );
  const height = y + PAD;

  const out = document.createElement("canvas");
  out.width = W;
  out.height = height;
  out.getContext("2d")!.drawImage(draft, 0, 0);
  return out;
}

function resultLine(ctx: CanvasRenderingContext2D, f: (s: number, w?: number) => string, r: Finding, x: number, y: number, w: number) {
  const tag = (r.severity ?? "minor").toUpperCase();
  ctx.font = f(12, 800);
  const tagW = ctx.measureText(tag).width + 16;
  ctx.fillStyle = r.severity === "major" ? RED : AMBER;
  roundRect(ctx, x, y + 2, tagW, 22, 11);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(tag, x + 8, y + 7);
  ctx.fillStyle = GREEN[900];
  ctx.font = f(18, 600);
  let ny = wrap(ctx, r.title, x + tagW + 10, y, w - tagW - 10, 25);
  if (r.confidence) {
    ctx.font = f(14);
    ctx.fillStyle = r.confidence === "low" ? "#92400e" : GREEN[600];
    ctx.fillText(`${r.confidence} confidence`, x + tagW + 10, ny);
    ny += 20;
  }
  return ny;
}

function heading(ctx: CanvasRenderingContext2D, f: (s: number, w?: number) => string, text: string, x: number, y: number) {
  ctx.fillStyle = GREEN[700];
  ctx.font = f(15, 800);
  ctx.fillText(text.toUpperCase(), x, y);
  return y + 30;
}

/** Draw wrapped text; returns the y below it. */
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number): number {
  for (const line of lines(ctx, text, maxW)) {
    ctx.fillText(line, x, y);
    y += lineH;
  }
  return y;
}

function measureWrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, lineH: number, font: string) {
  const before = ctx.font;
  ctx.font = font;
  const n = lines(ctx, text, maxW).length;
  ctx.font = before;
  return n * lineH;
}

function lines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxW && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
