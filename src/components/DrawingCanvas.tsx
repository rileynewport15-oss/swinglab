"use client";

import { useEffect, useRef, useState } from "react";
import {
  drawPlacementPoints,
  drawShape,
  hitTest,
  newId,
  shapeBounds,
  toPx,
  type Point,
  type Size,
} from "@/lib/shapes";
import type { DrawingApi } from "@/hooks/useDrawing";

// What the pointer is currently doing. Kept in a ref (not state) because it
// changes on every pointer move and doesn't need to trigger a re-render.
type Drag =
  | { mode: "create"; id: string; freehand: boolean; start: Point; points: Point[] }
  | { mode: "angle"; id: string; points: Point[]; index: number }
  | { mode: "handle"; id: string; start: Point; original: Point[]; index: number; moved: boolean }
  | { mode: "move"; id: string; start: Point; original: Point[]; moved: boolean }
  | { mode: "label"; id: string; start: Point; original: Point; moved: boolean };

const MIN_SHAPE_PX = 6; // ignore accidental clicks when drawing
const DELETE_BUTTON = 44; // px

type Props = { drawing: DrawingApi };

// Transparent canvas laid exactly over the video, plus the on-video buttons
// (placement instructions and delete). Drawings are redrawn whenever they
// change, so they stay put while the video plays.
export default function DrawingCanvas({ drawing }: Props) {
  const {
    shapes,
    tool,
    color,
    selectedId,
    setSelectedId,
    dispatch,
    placing,
    addPlacementPoint,
    cancelPlacing,
    deleteSelected,
  } = drawing;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  // Track the canvas's on-screen size (changes on window resize or rotation).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Redraw everything. We scale by devicePixelRatio so lines are sharp on
  // high-resolution screens.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || size.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    for (const shape of shapes) {
      drawShape(ctx, shape, size, {
        selected: shape.id === selectedId,
        showHandles: tool === "move" && !placing,
      });
    }
    if (placing) drawPlacementPoints(ctx, placing.points, placing.preset.color, size);
  }, [shapes, selectedId, size, tool, placing]);

  // Pointer position in video coordinates (0–1).
  function getPoint(e: React.PointerEvent): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function pxDistance(a: Point, b: Point) {
    const pa = toPx(a, size);
    const pb = toPx(b, size);
    return Math.hypot(pa.x - pb.x, pa.y - pb.y);
  }

  // Find the shape under the pointer. The selected shape is checked first,
  // then the rest from top (newest) to bottom.
  function findHit(p: Point) {
    const ordered = [...shapes]
      .reverse()
      .sort((a, b) => (a.id === selectedId ? -1 : b.id === selectedId ? 1 : 0));
    for (const shape of ordered) {
      const hit = hitTest(shape, toPx(p, size), size);
      if (hit) return { shape, hit };
    }
    return null;
  }

  // Desktop: change the cursor to show what's under the mouse.
  function updateCursor(p: Point) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (placing || tool !== "move") {
      canvas.style.cursor = "crosshair";
      return;
    }
    const found = findHit(p);
    canvas.style.cursor = !found ? "default" : found.hit.type === "handle" ? "grab" : "move";
  }

  function onPointerDown(e: React.PointerEvent) {
    if (dragRef.current || !e.isPrimary) return; // ignore a second finger
    // Stops text selection on desktop and scrolling/zooming on touch screens.
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers refuse capture for synthetic events; dragging still works.
    }
    const p = getPoint(e);

    // Placing a training aid: each click is the next point.
    if (placing) {
      addPlacementPoint(p, size);
      return;
    }

    if (tool === "move") {
      const found = findHit(p);
      if (!found) {
        setSelectedId(null);
        return;
      }
      const { shape, hit } = found;
      setSelectedId(shape.id);
      dispatch({ type: "saveHistory" });
      // A circle's center handle moves the whole circle; its edge handle resizes it.
      const isCircleCenter = shape.kind === "circle" && hit.type === "handle" && hit.index === 0;
      if (hit.type === "label") {
        dragRef.current = { mode: "label", id: shape.id, start: p, original: shape.labelOffset ?? { x: 0, y: 0 }, moved: false };
      } else if (hit.type === "handle" && !isCircleCenter) {
        dragRef.current = { mode: "handle", id: shape.id, start: p, original: shape.points, index: hit.index, moved: false };
      } else {
        dragRef.current = { mode: "move", id: shape.id, start: p, original: shape.points, moved: false };
      }
      canvasRef.current!.style.cursor = "grabbing";
      return;
    }

    if (tool === "angle") {
      // Each click adds the next point; hold the button down to fine-tune it.
      const pending = shapes.find((s) => s.kind === "angle" && s.points.length < 3);
      if (pending) {
        const points = [...pending.points, p];
        dispatch({ type: "setPoints", id: pending.id, points });
        dragRef.current = { mode: "angle", id: pending.id, points, index: points.length - 1 };
      } else {
        const id = newId();
        dispatch({ type: "add", shape: { id, kind: "angle", color, points: [p] } });
        dragRef.current = { mode: "angle", id, points: [p], index: 0 };
      }
      return;
    }

    // line, freehand, circle, box: start a new shape at the pointer.
    const id = newId();
    const points = tool === "freehand" ? [p] : [p, p];
    dispatch({ type: "add", shape: { id, kind: tool, color, points } });
    dragRef.current = { mode: "create", id, freehand: tool === "freehand", start: p, points };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    const p = getPoint(e);
    if (!drag) {
      if (e.pointerType === "mouse") updateCursor(p);
      return;
    }

    switch (drag.mode) {
      case "create": {
        if (drag.freehand) {
          const last = drag.points[drag.points.length - 1];
          if (pxDistance(last, p) < 2) return; // skip tiny wiggles
          drag.points = [...drag.points, p];
        } else {
          drag.points = [drag.start, p];
        }
        dispatch({ type: "setPoints", id: drag.id, points: drag.points });
        break;
      }
      case "angle": {
        drag.points = drag.points.map((q, i) => (i === drag.index ? p : q));
        dispatch({ type: "setPoints", id: drag.id, points: drag.points });
        break;
      }
      // Handle, move and label drags shift by how far the pointer has moved,
      // so nothing jumps when grabbed slightly off-center.
      case "handle":
      case "move":
      case "label": {
        const dx = p.x - drag.start.x;
        const dy = p.y - drag.start.y;
        if (dx === 0 && dy === 0) return;
        drag.moved = true;
        if (drag.mode === "label") {
          dispatch({
            type: "setLabelOffset",
            id: drag.id,
            offset: { x: drag.original.x + dx, y: drag.original.y + dy },
          });
          break;
        }
        const shift = (q: Point) => ({ x: q.x + dx, y: q.y + dy });
        dispatch({
          type: "setPoints",
          id: drag.id,
          points:
            drag.mode === "move"
              ? drag.original.map(shift)
              : drag.original.map((q, i) => (i === drag.index ? shift(q) : q)),
        });
        break;
      }
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    // Apply the final pointer position so shapes end exactly where it was released.
    if (e.type === "pointerup") onPointerMove(e);
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (e.pointerType === "mouse") updateCursor(getPoint(e));

    if (drag.mode === "create") {
      // A click without dragging shouldn't leave an invisible shape behind.
      const tooSmall = drag.freehand
        ? drag.points.length < 2
        : pxDistance(drag.points[0], drag.points[drag.points.length - 1]) < MIN_SHAPE_PX;
      if (tooSmall) dispatch({ type: "cancelShape", id: drag.id });
    }
    // Selecting a shape without moving it shouldn't create an undo step.
    if ((drag.mode === "move" || drag.mode === "handle" || drag.mode === "label") && !drag.moved) {
      dispatch({ type: "dropHistory" });
    }
  }

  // Place the delete button just above the selected shape's top-right corner.
  const selected = shapes.find((s) => s.id === selectedId);
  let deletePos: { left: number; top: number } | null = null;
  if (selected && !placing && size.width > 0) {
    const b = shapeBounds(selected, size);
    deletePos = {
      left: Math.min(Math.max(b.x + b.w + 8, 4), size.width - DELETE_BUTTON - 4),
      top: Math.min(Math.max(b.y - DELETE_BUTTON - 8, 4), size.height - DELETE_BUTTON - 4),
    };
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-label="Drawing layer"
        // touch-none: finger drags draw instead of scrolling or zooming the page.
        className="absolute inset-0 h-full w-full touch-none"
        style={{ cursor: placing || tool !== "move" ? "crosshair" : "default" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {placing && (
        <div className="pointer-events-none absolute inset-x-2 top-2 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-fairway-900/90 py-2 pl-4 pr-2 text-white shadow-lg">
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: placing.preset.color }}
            />
            <p className="text-sm font-semibold" role="status">
              {placing.preset.name}: {placing.preset.steps[placing.points.length]}
              {placing.preset.steps.length > 1 && (
                <span className="ml-2 font-normal text-white/70">
                  ({placing.points.length + 1}/{placing.preset.steps.length})
                </span>
              )}
            </p>
            <button
              onClick={cancelPlacing}
              className="min-h-11 rounded-xl bg-white/15 px-3 text-sm font-semibold hover:bg-white/25"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {deletePos && (
        <button
          onClick={deleteSelected}
          aria-label="Delete selected drawing"
          title="Delete (Delete key)"
          className="absolute flex items-center justify-center rounded-full bg-red-600 text-lg text-white shadow-lg ring-2 ring-white hover:bg-red-700"
          style={{ ...deletePos, width: DELETE_BUTTON, height: DELETE_BUTTON }}
        >
          🗑
        </button>
      )}
    </>
  );
}
