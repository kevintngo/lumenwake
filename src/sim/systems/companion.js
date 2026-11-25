// The lumen (content/companions.js): where it is, what it does in a fight, and
// what feeding does to it. It rides at the hero's left shoulder and takes a
// moment to catch up; while the hero has a creature in hand it puts a small bolt
// into it every few seconds; blows given and taken fill it, and when it is full
// its burst can be let go.

import { LUMENS, FOODS } from '../../content/companions.js';
import { lumenKind, lumenLevel, lumenGrown } from '../lumen.js';
import { makeEntity, pencils, dirFromYaw } from '../entities.js';
import { derive } from '../stats.js';
import { damp, dampAngle } from '../../core/math.js';

const ASSIST_EVERY = 2.6;      // seconds between its bolts
const FULL = 100;

export class Companion {
  constructor(game) {
    this.game = game;
    this.e = null;
    this.cd = ASSIST_EVERY;
    game.bus.on('zone', () => this.arrive());
    game.bus.on('class', () => this.dress());
    game.bus.on('damage', (d) => this.fill(d));
  }

  get lumen() { return this.game.player.sheet.lumen; }
  get kind() { return LUMENS[this.lumen.kind] || LUMENS.mote; }
  get ready() { return this.lumen.charge >= FULL; }

  /** A new place (everything but the hero was left behind): the lumen is at the shoulder again. */
  arrive() {
    const g = this.game, p = g.player, L = this.kind;
    this.e = g.entities.add(makeEntity('pet', 'lumen', {
      x: p.x - 0.7, z: p.z + 0.5, y: p.y + 1.45, radius: 0.3, height: 0.5, extra: L.shape, colors: pencils(L.colors), name: L.name, far: true,
    }));
    this.cd = ASSIST_EVERY;
  }

  /** Its shape and colours, after it has changed kind (or the hero has). */
  dress() {
    const e = this.e, L = this.kind;
    if (!e) return;
    e.extra = L.shape; e.colors = pencils(L.colors); e.name = L.name;
  }

  update(dt) {
    const g = this.game, p = g.player, e = this.e, l = this.lumen;
    if (!e || e.gone) return;
    e.grow = p.grow > 0.5 && !p.hidden && !p.dead ? Math.min(1, e.grow + dt * 4) : 0;
    // at the left shoulder, a little behind
    const [fx, fz] = dirFromYaw(p.yaw);
    const tx = p.x - fx * 0.5 + fz * 0.72, tz = p.z - fz * 0.5 - fx * 0.72, ty = p.y + (p.lift || 0) + 1.5;
    if (Math.hypot(tx - e.x, tz - e.z) > 14) { e.x = tx; e.z = tz; e.y = ty; }
    e.x = damp(e.x, tx, 5.5, dt); e.z = damp(e.z, tz, 5.5, dt); e.y = damp(e.y, ty, 7, dt);
    e.yaw = dampAngle(e.yaw, p.yaw, 6, dt);
    e.move = l.charge / FULL;                      // how brightly it burns: the shader reads this
    if (e.action) { e.actionT += dt / e.actionDur; if (e.actionT >= 1) e.action = 0; }
    // a small bolt into whatever the hero is fighting
    this.cd -= dt;
    const t = p.target;
    if (this.cd <= 0 && t && t.kind === 'monster' && !t.dead && !p.dead && Math.hypot(t.x - p.x, t.z - p.z) < 13) {
      this.cd = ASSIST_EVERY;
      this.bolt(t, 0.22 + 0.006 * l.ember, 0.3);
      g.bus.emit('lumen:bolt', { x: e.x, y: e.y, z: e.z });
    }
  }

  bolt(t, mult, size) {
    const g = this.game, e = this.e, dx = t.x - e.x, dz = t.z - e.z, d = Math.hypot(dx, dz) || 1;
    g.skills.launch({
      x: e.x, y: e.y - 0.3, z: e.z, vx: dx / d * 17, vz: dz / d * 17, life: 1.0, radius: 0.4, size, quiet: true,
      color: this.e.colors[1], onHit: (m) => g.combat.strike(m, mult, 0, false),
    });
  }

  /** Blows fill it: the hero's own, and more so the ones the hero takes. */
  fill(d) {
    const g = this.game, p = g.player, l = this.lumen;
    if (!l || l.charge >= FULL) return;
    if (d.target === p) l.charge += 6;
    else if (d.source === p && d.target.kind === 'monster') l.charge += d.crit ? 3.4 : 2.2;
    else return;
    if (l.charge >= FULL) { l.charge = FULL; g.bus.emit('lumen:ready', { kind: l.kind, name: this.kind.burst.name }); }
  }

  /** Lets the burst go, if it is full. */
  burst() {
    const g = this.game, p = g.player, l = this.lumen, e = this.e, b = this.kind.burst;
    if (!e || p.dead || l.charge < FULL) { if (e && !p.dead) g.bus.emit('deny'); return false; }
    l.charge = 0;
    const near = g.monsters.filter((m) => !m.dead).map((m) => ({ m, d: Math.hypot(m.x - p.x, m.z - p.z) })).sort((a, c) => a.d - c.d);
    if (b.kind === 'ring') for (const { m, d } of near) if (d < b.r + m.radius) g.combat.strike(m, b.mult);
    if (b.kind === 'volley' || b.kind === 'all') {
      const marks = near.filter((n) => n.d < 16);
      for (let k = 0; k < b.count && marks.length; k++) this.bolt(marks[k % marks.length].m, b.mult, 0.5);
    }
    if (b.seconds) p.invuln = Math.max(p.invuln, b.seconds);
    if (b.heal) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * b.heal);
    if (b.focus) p.focus = Math.min(p.maxFocus, p.focus + p.maxFocus * b.focus);
    e.action = 2; e.actionT = 0; e.actionDur = 0.6;
    g.bus.emit('lumen:burst', { kind: l.kind, burst: b, x: p.x, y: p.y, z: p.z, color: e.colors[1] });
    if (b.heal) g.bus.emit('heal', { entity: p });
    return true;
  }

  /** Feeds it one of something from the bag. Returns true if it ate. */
  feed(id) {
    const g = this.game, p = g.player, l = this.lumen, food = FOODS[id];
    if (!food || g.loot.count(id) < 1) return false;
    if (lumenGrown(l)) { g.bus.emit('log', { text: 'Your lumen is full grown: it will not eat any more.' }); return false; }
    g.loot.remove(id, 1);
    const before = lumenLevel(l);
    for (const t in food) l[t] += food[t];
    const level = lumenLevel(l);
    g.bus.emit('lumen:fed', { item: id, food, level });
    if (level !== before) {
      // a level: it is looked at again, and may have become something else
      const kind = lumenKind(l);
      if (kind !== l.kind) { l.kind = kind; this.dress(); g.bus.emit('lumen:changed', { kind, name: LUMENS[kind].name, x: this.e.x, y: this.e.y, z: this.e.z, color: this.e.colors[1] }); }
      else g.bus.emit('lumen:level', { level });
    }
    derive(p);
    g.bus.emit('bag:changed');
    return true;
  }
}
