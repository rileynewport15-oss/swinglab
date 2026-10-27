"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import type { Point, Shape, Size } from "@/lib/shapes";
import { createPresetShape, type Preset } from "@/lib/presets";

export type Tool = "move" | "line" | "freehand" | "circle" | "box" | "angle";

// All changes to the drawing go through this reducer. Before any change that
// the user would want to undo, we save a copy of the shapes list in `past`.
// Undo simply restores the last saved copy.
type State = { shapes: Shape[]; past: Shape[][] };

type Action =
  | { type: "add"; shape: Shape } // saves history
  | { type: "saveHistory" } // call before a drag that edits a shape
  | { type: "dropHistory" } // undo a saveHistory when nothing changed (e.g. a click)
  | { type: "setPoints"; id: string; points: Point[] } // live edits, no history
  | { type: "setLabelAt"; id: string; at: Point } // live edits, no history
  | { type: "cancelShape"; id: string } // remove a just-added shape + its history
  | { type: "replaceAuto"; shapes: Shape[] } // swap all auto-placed aids for new ones
  | { type: "remove"; id: string }
  | { type: "recolor"; id: string; color: string }
  | { type: "undo" }
  | { type: "clear" };

const MAX_HISTORY = 50;

function withHistory(state: State): Shape[][] {
  return [...state.past, state.shapes].slice(-MAX_HISTORY);
}

function updateShape(state: State, id: string, change: Partial<Shape>): Shape[] {
  return state.shapes.map((s) => (s.id === id ? { ...s, ...change } : s));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add":
      return { shapes: [...state.shapes, action.shape], past: withHistory(state) };
    case "saveHistory":
      return { ...state, past: withHistory(state) };
    case "dropHistory":
      return { ...state, past: state.past.slice(0, -1) };
    case "setPoints":
      return { ...state, shapes: updateShape(state, action.id, { points: action.points }) };
    case "setLabelAt":
      return { ...state, shapes: updateShape(state, action.id, { labelAt: action.at }) };
    case "cancelShape":
      return {
        shapes: state.shapes.filter((s) => s.id !== action.id),
        past: state.past.slice(0, -1),
      };
    case "replaceAuto":
      return {
        shapes: [...state.shapes.filter((s) => !s.auto), ...action.shapes],
        past: withHistory(state),
      };
    case "remove":
      return {
        shapes: state.shapes.filter((s) => s.id !== action.id),
        past: withHistory(state),
      };
    case "recolor":
      return { shapes: updateShape(state, action.id, { color: action.color }), past: withHistory(state) };
    case "undo":
      if (state.past.length === 0) return state;
      return { shapes: state.past[state.past.length - 1], past: state.past.slice(0, -1) };
    case "clear":
      if (state.shapes.length === 0) return state;
      return { shapes: [], past: withHistory(state) };
  }
}

export const COLORS = ["#facc15", "#ef4444", "#ffffff", "#38bdf8", "#22c55e", "#f472b6"];

// While placing a training aid: which aid, and the points clicked so far.
export type Placing = { preset: Preset; points: Point[] };

export function useDrawing() {
  const [state, dispatch] = useReducer(reducer, { shapes: [], past: [] });
  const [tool, setToolState] = useState<Tool>("line");
  const [color, setColorState] = useState(COLORS[0]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placing, setPlacing] = useState<Placing | null>(null);

  // A half-placed angle (fewer than 3 points) is thrown away when switching tools.
  const dropUnfinishedAngle = useCallback(() => {
    const unfinished = state.shapes.find((s) => s.kind === "angle" && s.points.length < 3);
    if (unfinished) dispatch({ type: "cancelShape", id: unfinished.id });
  }, [state.shapes]);

  const setTool = useCallback(
    (t: Tool) => {
      dropUnfinishedAngle();
      setPlacing(null);
      setToolState(t);
      if (t !== "move") setSelectedId(null);
    },
    [dropUnfinishedAngle],
  );

  // Picking a color also recolors the selected shape, if any.
  const setColor = useCallback(
    (c: string) => {
      setColorState(c);
      if (selectedId) dispatch({ type: "recolor", id: selectedId, color: c });
    },
    [selectedId],
  );

  const undo = useCallback(() => {
    dispatch({ type: "undo" });
    setSelectedId(null);
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: "clear" });
    setSelectedId(null);
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedId) dispatch({ type: "remove", id: selectedId });
    setSelectedId(null);
  }, [selectedId]);

  // Training aids: choose one, then click the video once per step.
  const startPlacing = useCallback(
    (preset: Preset) => {
      dropUnfinishedAngle();
      setSelectedId(null);
      setPlacing({ preset, points: [] });
    },
    [dropUnfinishedAngle],
  );

  const cancelPlacing = useCallback(() => setPlacing(null), []);

  const addPlacementPoint = useCallback(
    (p: Point, size: Size) => {
      if (!placing) return;
      const points = [...placing.points, p];
      if (points.length < placing.preset.steps.length) {
        setPlacing({ ...placing, points });
        return;
      }
      // Last click: create the aid, select it, and switch to Move so it can be adjusted.
      const shape = createPresetShape(placing.preset, points, size);
      dispatch({ type: "add", shape });
      setPlacing(null);
      setSelectedId(shape.id);
      setToolState("move");
    },
    [placing],
  );

  // Put pose-detected aids on the video, replacing any earlier auto aids.
  const placeAutoAids = useCallback((aids: Shape[]) => {
    dispatch({ type: "replaceAuto", shapes: aids });
    setPlacing(null);
    setSelectedId(null);
    setToolState("move");
  }, []);

  // Keyboard shortcuts for computer use:
  // Delete/Backspace removes the selection, Esc cancels, Ctrl/⌘+Z undoes.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" && (target as HTMLInputElement).type !== "range") return;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === "Escape") {
        setPlacing(null);
        setSelectedId(null);
      } else if (e.key.toLowerCase() === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, deleteSelected, undo]);

  return {
    shapes: state.shapes,
    canUndo: state.past.length > 0,
    dispatch,
    tool,
    setTool,
    color,
    setColor,
    selectedId,
    setSelectedId,
    undo,
    clear,
    deleteSelected,
    placing,
    startPlacing,
    cancelPlacing,
    addPlacementPoint,
    placeAutoAids,
  };
}

export type DrawingApi = ReturnType<typeof useDrawing>;
