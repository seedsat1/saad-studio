export interface AppEvent {
  type: string;
  payload: any;
  timestamp: number;
}

export type EventCallback = (event: AppEvent) => void | Promise<void>;

export class EventBus {
  private static listeners: Record<string, EventCallback[]> = {};

  static subscribe(eventType: string, callback: EventCallback): () => void {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType]!.push(callback);
    return () => {
      if (this.listeners[eventType]) {
        this.listeners[eventType] = this.listeners[eventType]!.filter(
          (cb) => cb !== callback
        );
      }
    };
  }

  static async publish(type: string, payload: any): Promise<void> {
    const event: AppEvent = {
      type,
      payload,
      timestamp: Date.now(),
    };

    const callbacks = this.listeners[type] || [];
    const wildcardCallbacks = this.listeners["*"] || [];
    const allCallbacks = [...callbacks, ...wildcardCallbacks];

    await Promise.all(
      allCallbacks.map(async (cb) => {
        try {
          await cb(event);
        } catch (err) {
          console.error(`Error executing event callback for ${type}:`, err);
        }
      })
    );
  }

  static clearAll(): void {
    this.listeners = {};
  }
}
