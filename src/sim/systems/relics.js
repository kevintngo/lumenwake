// What the relics do (content/relics.js says which there are). Every power is
// one short method here, called from the one place in the rules where its
// moment happens: a blow landing (combat.js), the third blow of a chain
// (player.js), a creature falling, the hero being struck, a landing, the
// lumen's bolt (companion.js), the step (skills.js). `has(id)` asks whether the
// hero is wearing that relic (stats.js fills player.relic from what is worn).
//
// A power's own blows are `indirect` (combat.strike's fifth argument): they do
// not set off the powers that answer the hero's own hand, so nothing feeds itself.

import { RELICS, relicsOf, relicChance } from '../../content/relics.js';
import { rollItem } from '../items.js';
import { rand } from '../rng.js';

export class Relics {
  constructor(game) {
    this.game = game;
    this.thornCd = 0; this.meteorCd = 0; this.tick = 0;
    this.vigilUsed = false;
    const bus = game.bus;
    bus.on('mission:begin', () => { this.vigilUsed = false; });
    bus.on('zone', () => { this.thornCd = 0; this.meteorCd = 0; Object.assign(game.player, { rush: 0, jumped: false }); });
    bus.on('jump', (d) => { if (d.entity === game.player) game.player.jumped = true; });
    bus.on('landed', () => this.landed());
  }

  has(id) { const r = this.game.player.relic; return !!(r && r[id]); }

  /** Strikes everything within r of a point for `mult` attacks' worth. */
  area(x, z, r, mult, skip = null) {
    const g = this.game;
    for (const m of g.monsters) if (!m.dead && m !== skip && Math.hypot(m.x - x, m.z - z) <= r + m.radius) g.combat.strike(m, mult, 0, false, true);
  }
  ring(id, x, y, z, r, heavy = false) { this.game.bus.emit('relic:ring', { id, x, y, z, r, heavy }); }

  update(dt) {
    const g = this.game, p = g.player;
    this.thornCd -= dt; this.meteorCd -= dt;
    if (p.rush > 0) p.rush -= dt;
    // rot eats at whatever carries it, twice a second
    const R = RELICS.rot;
    this.tick -= dt;
    const bite = this.tick <= 0;
    if (bite) this.tick += 0.5;
    for (const m of g.monsters) {
      if (!m.rot) continue;
      if (m.dead || (m.rot.t -= dt) <= 0) { m.rot = null; continue; }
      if (bite && !p.dead) g.combat.damage(m, Math.max(1, Math.round(p.attack * R.each * m.rot.n * 0.5 * this.more(m))), p, false, true);
    }
  }

  // ---- the hero's own blows
  /** How much more a blow does to this creature. (Brinebite: a slowed one takes more.) */
  more(m) { return this.has('chill') && m.slow && m.slow.t > 0 ? 1 + RELICS.chill.more : 1; }

  /** A blow of the hero's own hand, or one of their abilities, has landed on m. */
  landedOn(m) {
    if (m.dead) return;
    if (this.has('rot')) m.rot = { n: Math.min(RELICS.rot.stacks, (m.rot ? m.rot.n : 0) + 1), t: RELICS.rot.seconds };
    if (this.has('chill')) {
      const C = RELICS.chill, on = m.slow && m.slow.t > 0;
      m.slow = { k: on ? Math.min(m.slow.k, C.slow) : C.slow, t: Math.max(on ? m.slow.t : 0, C.seconds) };
    }
  }

  /** The third blow of a chain has landed at a point. (Warden's Weight) */
  quake(x, y, z) {
    if (!this.has('quake')) return;
    const R = RELICS.quake;
    this.ring('quake', x, y, z, R.radius);
    this.area(x, z, R.radius, R.mult);
  }

  // ---- what happens round the hero
  /** The hero has felled m. (Sporecase bursts it; Slipstream quickens the hero.) */
  felled(m) {
    const g = this.game, p = g.player;
    if (this.has('rush')) p.rush = RELICS.rush.seconds;
    if (this.has('spore') && !m.boss) {
      const R = RELICS.spore, x = m.x, y = m.y, z = m.z;
      // a moment later, so a pack goes off one after another and can be seen to
      g.skills.later(0.14, () => { this.ring('spore', x, y, z, R.radius); this.area(x, z, R.radius, R.mult, m); });
    }
  }

  /** A creature's blow has hurt the hero. (Stoneback strikes it back.) */
  struck(m) {
    const g = this.game, p = g.player, R = RELICS.thorn;
    if (!this.has('thorn') || this.thornCd > 0 || !m || m.kind !== 'monster' || m.dead) return;
    const dx = m.x - p.x, dz = m.z - p.z, d = Math.hypot(dx, dz) || 1;
    if (d > R.reach + m.radius) return;
    this.thornCd = R.every;
    this.ring('thorn', p.x, p.y, p.z, 2.2);
    g.combat.strike(m, R.mult, 0, false, true);
    if (!m.dead && !m.def.giant && !m.guard && m.ai.state !== 'special') { m.ai.pushX = dx / d * R.shove; m.ai.pushZ = dz / d * R.shove; }
  }

  /** A blow is about to fell the hero. True if Last Light holds: the blow is not taken. */
  vigil() {
    const g = this.game, p = g.player, R = RELICS.vigil;
    if (!this.has('vigil') || this.vigilUsed || !g.missions.active) return false;
    this.vigilUsed = true;
    p.hp = Math.max(p.hp, Math.round(p.maxHp * R.health));
    p.invuln = Math.max(p.invuln, R.seconds);
    this.ring('vigil', p.x, p.y, p.z, 4.5, true);
    g.bus.emit('heal', { entity: p });
    g.bus.emit('miss', { target: p, text: 'Last Light' });
    g.bus.emit('log', { text: '<b class="c-relic">Last Light</b> held. It will not hold again on this contract.' });
    return true;
  }

  /** The hero has come down from a jump. (Meteor Heel) */
  landed() {
    const g = this.game, p = g.player, R = RELICS.meteor;
    const jumped = p.jumped;
    p.jumped = false;
    if (!jumped || !this.has('meteor') || this.meteorCd > 0 || p.dead) return;
    this.meteorCd = R.every;
    this.ring('meteor', p.x, p.y, p.z, R.radius, true);
    this.area(p.x, p.z, R.radius, R.mult);
  }

  /** The lumen's bolt has struck m for `mult`. (Wick: it leaps on to the nearest others.) */
  leap(m, mult) {
    if (!this.has('wick')) return;
    const g = this.game, R = RELICS.wick;
    const near = g.monsters.filter((o) => o !== m && !o.dead && Math.hypot(o.x - m.x, o.z - m.z) <= R.reach + o.radius)
      .sort((a, b) => Math.hypot(a.x - m.x, a.z - m.z) - Math.hypot(b.x - m.x, b.z - m.z)).slice(0, R.leaps);
    for (const o of near) {
      g.bus.emit('relic:leap', { x0: m.x, y0: m.y + m.height * 0.5, z0: m.z, x: o.x, y: o.y + o.height * 0.5, z: o.z });
      g.combat.strike(o, mult, 0, false, true);
    }
  }

  // ---- where relics come from
  /**
   * An elder has fallen: it may leave one of its relics (content/relics.js has the odds). The one the surveyor has
   * not found yet is the likelier of its two. Nothing on the first-steps contract, which is laid out by hand.
   */
  drop(m) {
    const g = this.game, s = g.player.sheet, a = g.missions.active;
    const pool = relicsOf(m.defId);
    if (!pool.length || !a || a.offer.first) return null;
    if (rand() >= relicChance(m.threat || 0, s.relicDry || 0)) { s.relicDry = (s.relicDry || 0) + 1; return null; }
    s.relicDry = 0;
    const found = s.relics || {}, fresh = pool.filter((r) => !found[r.id]);
    const from = fresh.length && (fresh.length === pool.length || rand() < 0.75) ? fresh : pool;
    const item = rollItem({ relic: from[Math.floor(rand() * from.length)].id, ilvl: m.level, cls: s.cls });
    g.loot.dropGear(m.x, m.y, m.z, item);
    return item;
  }
}
