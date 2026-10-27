"use client";

import { COLORS, type DrawingApi, type Tool } from "@/hooks/useDrawing";

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: "move", label: "Move", icon: "✋" },
  { id: "line", label: "Line", icon: "╱" },
  { id: "freehand", label: "Draw", icon: "✎" },
  { id: "circle", label: "Circle", icon: "◯" },
  { id: "box", label: "Box", icon: "▢" },
  { id: "angle", label: "Angle", icon: "∠" },
];

const HINTS: Record<Tool, string> = {
  move: "Click a drawing to select it. Drag its dots, line, or label. Delete key removes it.",
  line: "Drag on the video to draw a straight line.",
  freehand: "Drag on the video to draw freely.",
  circle: "Drag from the center outward.",
  box: "Drag from one corner to the opposite corner.",
  angle: "Click 3 points: one end, the corner, then the other end.",
};

type Props = { drawing: DrawingApi };

export default function DrawingToolbar({ drawing }: Props) {
  const { tool, setTool, color, setColor, canUndo, undo, clear, shapes, selectedId, deleteSelected } =
    drawing;

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-bold text-fairway-900">Draw</h2>
        <p className="text-xs text-fairway-700">{HINTS[tool]}</p>
      </div>

      {/* Tools */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="group" aria-label="Drawing tool">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            aria-pressed={tool === t.id}
            className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-xs font-semibold ${
              tool === t.id
                ? "bg-fairway-700 text-white"
                : "bg-fairway-50 text-fairway-800 active:bg-fairway-100 hover:bg-fairway-100"
            }`}
          >
            <span aria-hidden className="text-lg leading-none">
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Colors: quick swatches plus a full color picker */}
      <div className="flex flex-wrap items-center justify-between gap-1.5" role="group" aria-label="Color">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            aria-pressed={color === c}
            className={`h-10 w-10 shrink-0 rounded-full border-2 ${
              color === c ? "border-fairway-900 ring-2 ring-fairway-500 ring-offset-2" : "border-fairway-200"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <label
          className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-fairway-200 bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]"
          aria-label="Custom color"
        >
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-2">
        <ActionButton onClick={undo} disabled={!canUndo}>
          ↶ Undo
        </ActionButton>
        <ActionButton onClick={deleteSelected} disabled={!selectedId}>
          🗑 Delete
        </ActionButton>
        <ActionButton onClick={clear} disabled={shapes.length === 0} danger>
          Clear all
        </ActionButton>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 rounded-xl text-sm font-semibold disabled:opacity-40 ${
        danger
          ? "bg-red-50 text-red-700 active:bg-red-100"
          : "bg-fairway-50 text-fairway-800 active:bg-fairway-100 hover:bg-fairway-100"
      }`}
    >
      {children}
    </button>
  );
}
