// Tiny publish/subscribe bus. Gameplay systems emit facts ("monster:died");
// UI, audio and effects listen. Nothing in the simulation calls them directly,
// which is what keeps new features from tangling into old ones.

export class EventBus {
  constructor() {
    this.handlers = new Map();
  }
  on(type, fn) {
    let list = this.handlers.get(type);
    if (!list) this.handlers.set(type, (list = []));
    list.push(fn);
    return () => list.splice(list.indexOf(fn), 1);
  }
  emit(type, payload) {
    const list = this.handlers.get(type);
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      // one faulty listener (a HUD widget, a sound) must not stop the others or the game
      try { list[i](payload); } catch (err) { console.error(`Listener for "${type}" failed:`, err); }
    }
  }
}
