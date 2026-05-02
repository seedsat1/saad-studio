"use client";

import { createContext, useContext } from "react";
import type { CanvasNodeSettings } from "./canvas-types";

export interface CanvasContextValue {
  runNode: (id: string) => void;
  deleteNode: (id: string) => void;
  updateNodeSettings: (id: string, patch: Partial<CanvasNodeSettings>) => void;
}

export const CanvasContext = createContext<CanvasContextValue>({
  runNode: () => {},
  deleteNode: () => {},
  updateNodeSettings: () => {},
});

export function useCanvasActions(): CanvasContextValue {
  return useContext(CanvasContext);
}
