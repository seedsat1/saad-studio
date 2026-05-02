"use client";

import { createContext, useContext } from "react";
import type { CanvasNodeSettings, CanvasNodeType } from "./canvas-types";

export interface CanvasContextValue {
  runNode: (id: string) => void;
  deleteNode: (id: string) => void;
  updateNodeSettings: (id: string, patch: Partial<CanvasNodeSettings>) => void;
  addNodeAfter: (sourceId: string, nodeType: CanvasNodeType) => void;
}

export const CanvasContext = createContext<CanvasContextValue>({
  runNode: () => {},
  deleteNode: () => {},
  updateNodeSettings: () => {},
  addNodeAfter: () => {},
});

export function useCanvasActions(): CanvasContextValue {
  return useContext(CanvasContext);
}
