type EventHandler<T> = (payload: T) => void;

export class EventBus<Events extends object = Record<string, unknown>> {
  private readonly handlers = new Map<keyof Events, EventHandler<unknown>[]>();

  on<K extends keyof Events>(type: K, fn: EventHandler<Events[K]>): () => void {
    let list = this.handlers.get(type);
    if (!list) {
      list = [];
      this.handlers.set(type, list);
    }
    const wrapped = fn as EventHandler<unknown>;
    list.push(wrapped);
    return () => {
      const idx = list.indexOf(wrapped);
      if (idx >= 0) list.splice(idx, 1);
    };
  }

  emit<K extends keyof Events>(type: K, ...args: Events[K] extends void ? [] : [Events[K]]): void {
    const list = this.handlers.get(type);
    if (!list) return;
    const payload = args[0];
    for (let i = 0; i < list.length; i++) {
      try {
        list[i](payload);
      } catch (err) {
        console.error(`Listener for "${String(type)}" failed:`, err);
      }
    }
  }

  onDynamic(type: keyof Events, fn: (payload: unknown) => void): () => void {
    return this.on(type, fn as EventHandler<Events[keyof Events]>);
  }

  emitDynamic(type: keyof Events, payload?: unknown): void {
    const list = this.handlers.get(type);
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      try {
        list[i](payload);
      } catch (err) {
        console.error(`Listener for "${String(type)}" failed:`, err);
      }
    }
  }
}
