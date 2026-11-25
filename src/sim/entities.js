// Entities are plain objects in one list. Systems add the fields they own
// (a monster gets `ai`, the player gets `stats`), and the view reads the common
// ones below to draw them. No classes, no inheritance: a new kind of thing is a
// new `kind` string and whichever systems care about it.

/** Facing convention shared with the shaders: yaw 0 looks along +z. */
export const yawFromDir = (dx, dz) => Math.atan2(-dx, dz);
export const dirFromYaw = (yaw) => [-Math.sin(yaw), Math.cos(yaw)];

export function makeEntity(kind, archetype, props) {
  return Object.assign({
    id: 0, kind, archetype,
    x: 0, y: 0, z: 0, yaw: 0, scale: 1, grow: 1,   // grow: 0..1 spawn/death scale
    radius: 0.4, height: 1.4,
    move: 0, walk: 0,                 // movement blend 0..1 and stride phase
    action: 0, actionT: 0, actionDur: 0.4,   // 1 attack, 2 cast, 3 flinch
    flash: 0, shade: 1, seed: Math.random(),
    colors: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], extra: 0, lift: 0,
    ghost: false, hover: false, dead: false, gone: false,
    name: '', level: 1, hp: 1, maxHp: 1,
  }, props);
}

/** An entity's three pencils [body, accent, detail], given as 0-255 triples. */
export const pencils = (list) => list.map((c) => c.map((v) => v / 255));

export class Entities {
  constructor() {
    this.list = [];
    this.byId = new Map();
    this.nextId = 1;
  }
  add(e) {
    e.id = this.nextId++;
    this.list.push(e);
    this.byId.set(e.id, e);
    return e;
  }
  get(id) { return this.byId.get(id); }
  /** Drops everything flagged `gone`. Called once per frame. */
  sweep() {
    const list = this.list;
    let w = 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.gone) this.byId.delete(e.id); else list[w++] = e;
    }
    list.length = w;
  }
  /** Nearest living entity of a kind within range, or null. */
  nearest(kind, x, z, range, filter) {
    let best = null, bd = range;
    for (const e of this.list) {
      if (e.kind !== kind || e.dead || (filter && !filter(e))) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
}
