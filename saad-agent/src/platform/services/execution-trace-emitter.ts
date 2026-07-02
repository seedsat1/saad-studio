export interface ExecutionTraceEvent {
  id: string;
  taskId: string;
  conversationId: string;
  phase: string;
  status: "pending" | "active" | "done" | "failed" | "skipped";
  label: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  sourceService?: string;
  evidence?: any;
  safeDetails?: any;
  error?: string;
  confidence?: number;
}

export type TraceEventCallback = (event: ExecutionTraceEvent) => void;

class TraceEmitter {
  private listeners: Set<TraceEventCallback> = new Set();

  onEvent(callback: TraceEventCallback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  emit(event: Omit<ExecutionTraceEvent, "id"> & { id?: string }) {
    const fullEvent: ExecutionTraceEvent = {
      id: event.id || `trace-ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      startedAt: event.startedAt || new Date().toISOString(),
      ...event
    } as ExecutionTraceEvent;

    for (const listener of this.listeners) {
      try {
        listener(fullEvent);
      } catch (err) {
        console.error("Error in ExecutionTraceEmitter listener:", err);
      }
    }
  }
}

export const ExecutionTraceEmitter = new TraceEmitter();
