"use client";

import { useEffect, useRef, useState } from "react";
import { drawShape, hitTest, newId, toPx, type Point, type Size } from "@/lib/shapes";
import type { DrawingApi } from "@/hooks/useDrawing";

// What the finger is currently doing. Kept in a ref (not state) because it
// changes on every pointer move and doesn't need to trigger a re-render.
type Drag =
  | { mode: "create"; id: string; start: Point; points: Point[] }
  | { mode: "angle"; id: string; points: Point[]; index: number }
  | { mode: "handle"; id: string; start: Point; original: Point[]; index: number; moved: boolean }
  | { mode: "move"; id: string; start: Point; original: Point[]; moved: boolean };

const MIN_SHAPE_PX = 6; // ignore accidental taps when drawing

type Props = { drawing: DrawingApi };

// Transparent canvas laid exactly over the video. It redraws all shapes
// whenever they change, so drawings stay put while the video plays.
export default function DrawingCanvas({ drawing }: Props) {
  const { shapes, tool, color, selectedId, setSelectedId, dispatch } = drawing;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  // Track the canvas's on-screen size (changes on rotate/resize).
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
  // high-resolution phone screens.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || size.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    for (const shape of shapes) drawShape(ctx, shape, size, shape.id === selectedId);
  }, [shapes, selectedId, size]);

  // Pointer position as a fraction of the canvas (0–1).
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

  function onPointerDown(e: React.PointerEvent) {
    if (dragRef.current) return; // ignore a second finger
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = getPoint(e);

    if (tool === "move") {
      // Check the selected shape first, then the rest from top to bottom.
      const ordered = [...shapes].reverse().sort((a, b) =>
        a.id === selectedId ? -1 : b.id === selectedId ? 1 : 0,
      );
      for (const shape of ordered) {
        const hit = hitTest(shape, toPx(p, size), size);
        if (!hit) continue;
        setSelectedId(shape.id);
        dispatch({ type: "saveHistory" });
        // A circle's center dot moves the whole circle; its edge dot resizes it.
        const isCircleCenter = shape.kind === "circle" && hit.type === "handle" && hit.index === 0;
        dragRef.current =
          hit.type === "handle" && !isCircleCenter
            ? { mode: "handle", id: shape.id, start: p, original: shape.points, index: hit.index, moved: false }
            : { mode: "move", id: shape.id, start: p, original: shape.points, moved: false };
        return;
      }
      setSelectedId(null);
      return;
    }

    if (tool === "angle") {
      // Each tap adds the next point; keep the finger down to fine-tune it.
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

    // line, freehand, circle, box: start a new shape at the finger.
    const id = newId();
    const points = tool === "freehand" ? [p] : [p, p];
    dispatch({ type: "add", shape: { id, kind: tool, color, points } });
    dragRef.current = { mode: "create", id, start: p, points };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const p = getPoint(e);

    switch (drag.mode) {
      case "create": {
        const shape = shapes.find((s) => s.id === drag.id);
        if (shape?.kind === "freehand") {
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
      // Handle and move drags shift points by how far the finger has moved,
      // so a shape doesn't jump when grabbed slightly off-center.
      case "handle":
      case "move": {
        const dx = p.x - drag.start.x;
        const dy = p.y - drag.start.y;
        if (dx === 0 && dy === 0) return;
        drag.moved = true;
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
    // Apply the final finger position so shapes end exactly where it lifted.
    if (e.type === "pointerup") onPointerMove(e);
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    if (drag.mode === "create") {
      // A tap without dragging shouldn't leave an invisible shape behind.
      const tooSmall =
        drag.points.length < 2 ||
        pxDistance(drag.points[0], drag.points[drag.points.length - 1]) < MIN_SHAPE_PX;
      const isFreehand = shapes.find((s) => s.id === drag.id)?.kind === "freehand";
      if (isFreehand ? drag.points.length < 2 : tooSmall) {
        dispatch({ type: "cancelShape", id: drag.id });
      }
    }
    // Selecting a shape without moving it shouldn't create an undo step.
    if ((drag.mode === "move" || drag.mode === "handle") && !drag.moved) {
      dispatch({ type: "dropHistory" });
    }
  }

  return (
    <canvas
      ref={canvasRef}
      aria-label="Drawing layer"
      className="absolute inset-0 h-full w-full touch-none"
      style={{ cursor: tool === "move" ? "grab" : "crosshair" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
