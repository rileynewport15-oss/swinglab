"use client";

import { useCallback, useReducer, useState } from "react";
import type { Point, Shape } from "@/lib/shapes";

export type Tool = "move" | "line" | "freehand" | "circle" | "box" | "angle";

// All changes to the drawing go through this reducer. Before any change that
// the user would want to undo, we save a copy of the shapes list in `past`.
// Undo simply restores the last saved copy.
type State = { shapes: Shape[]; past: Shape[][] };

type Action =
  | { type: "add"; shape: Shape } // saves history
  | { type: "saveHistory" } // call before a drag that edits a shape
  | { type: "dropHistory" } // undo a saveHistory when nothing changed (e.g. a tap)
  | { type: "setPoints"; id: string; points: Point[] } // live edits, no history
  | { type: "cancelShape"; id: string } // remove a just-added shape + its history
  | { type: "remove"; id: string }
  | { type: "recolor"; id: string; color: string }
  | { type: "undo" }
  | { type: "clear" };

const MAX_HISTORY = 50;

function withHistory(state: State): Shape[][] {
  return [...state.past, state.shapes].slice(-MAX_HISTORY);
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
      return {
        ...state,
        shapes: state.shapes.map((s) =>
          s.id === action.id ? { ...s, points: action.points } : s,
        ),
      };
    case "cancelShape":
      return {
        shapes: state.shapes.filter((s) => s.id !== action.id),
        past: state.past.slice(0, -1),
      };
    case "remove":
      return {
        shapes: state.shapes.filter((s) => s.id !== action.id),
        past: withHistory(state),
      };
    case "recolor":
      return {
        shapes: state.shapes.map((s) =>
          s.id === action.id ? { ...s, color: action.color } : s,
        ),
        past: withHistory(state),
      };
    case "undo":
      if (state.past.length === 0) return state;
      return { shapes: state.past[state.past.length - 1], past: state.past.slice(0, -1) };
    case "clear":
      if (state.shapes.length === 0) return state;
      return { shapes: [], past: withHistory(state) };
  }
}

export const COLORS = ["#facc15", "#ef4444", "#ffffff", "#38bdf8", "#22c55e", "#f472b6"];

export function useDrawing() {
  const [state, dispatch] = useReducer(reducer, { shapes: [], past: [] });
  const [tool, setToolState] = useState<Tool>("line");
  const [color, setColorState] = useState(COLORS[0]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // A half-placed angle (fewer than 3 points) is thrown away when switching tools.
  const setTool = useCallback(
    (t: Tool) => {
      const unfinished = state.shapes.find((s) => s.kind === "angle" && s.points.length < 3);
      if (unfinished) dispatch({ type: "cancelShape", id: unfinished.id });
      setToolState(t);
      if (t !== "move") setSelectedId(null);
    },
    [state.shapes],
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

  // Drop a ready-made shape (training aid) on the video, then switch to Move
  // with it selected so it can be dragged into place right away.
  const addAndSelect = useCallback((shape: Shape) => {
    dispatch({ type: "add", shape });
    setSelectedId(shape.id);
    setToolState("move");
  }, []);

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
    addAndSelect,
  };
}

export type DrawingApi = ReturnType<typeof useDrawing>;
