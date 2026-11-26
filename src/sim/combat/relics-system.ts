import { CREATURES } from '../../data/creatures';
import { RELICS, type RelicDef } from '../../data/relics';
import type { CreatureId, RelicId } from '../../types/domain';
import type { MonsterEntity } from '../../types/entity';
import type { GameContext, RelicsLike } from '../../types/game-context';
import { rollItem } from '../inventory/gear-service';
import { rand } from '../sim-rng';
import { applyKnockback } from './monster-specials';

/** an elder's relics; the elders of newer places carry those of the elder whose shape they share */
export const relicsOf = (elder: CreatureId): RelicDef[] => {
  const own = Object.values(RELICS).filter((r) => r.from === elder);
  const kin = CREATURES[elder]?.archetype;
  return own.length || !kin ? own : Object.values(RELICS).filter((r) => r.from === kin);
};

export const relicChance = (rank = 0, dry = 0): number =>
  Math.min(1, 0.18 + 0.14 * rank + 0.15 * dry);

export class Relics implements RelicsLike {
  private readonly game: GameContext;
  private thornCd = 0;
  private meteorCd = 0;
  private tick = 0;
  private jumped = false;

  constructor(game: GameContext) {
    this.game = game;
    const bus = game.bus;
    bus.on('mission:begin', () => {
      game.player.vigilUsed = false;
    });
    bus.on('zone', () => {
      this.thornCd = 0;
      this.meteorCd = 0;
      this.jumped = false;
      game.player.rush = 0;
    });
    bus.on('jump', (d) => {
      if (d.entity === game.player) this.jumped = true;
    });
    bus.on('landed', () => this.landed());
  }

  has(id: RelicId): boolean {
    const r = this.game.player.relic;
    return !!(r && r[id]);
  }

  private area(x: number, z: number, r: number, mult: number, skip: MonsterEntity | null = null): void {
    const g = this.game;
    for (const m of g.monsters) {
      if (!m.dead && m !== skip && Math.hypot(m.x - x, m.z - z) <= r + m.radius) {
        g.combat.strike(m, mult, 0, false, true);
      }
    }
  }

  private ring(id: RelicId, x: number, y: number, z: number, r: number, heavy = false): void {
    this.game.bus.emit('relic:ring', { id, x, y, z, r, heavy });
  }

  update(dt: number): void {
    const g = this.game;
    const p = g.player;
    this.thornCd -= dt;
    this.meteorCd -= dt;
    if (p.rush > 0) p.rush -= dt;
    const each = RELICS.rot.each ?? 0.18;
    this.tick -= dt;
    const bite = this.tick <= 0;
    if (bite) this.tick += 0.5;
    for (const m of g.monsters) {
      if (!m.rot || m.rotT <= 0) continue;
      m.rotT -= dt;
      if (m.dead || m.rotT <= 0) {
        m.rot = 0;
        m.rotT = 0;
        continue;
      }
      if (bite && !p.dead) {
        const dmg = Math.max(1, Math.round(p.attack * each * m.rot * 0.5 * this.more(m)));
        g.combat.damage(m, dmg, p, false, true, true);
      }
    }
  }

  more(m: MonsterEntity): number {
    return this.has('chill') && m.slowT > 0 ? 1 + (RELICS.chill.more ?? 0.2) : 1;
  }

  landedOn(m: MonsterEntity): void {
    if (m.dead) return;
    if (this.has('rot')) {
      const stacks = RELICS.rot.stacks ?? 3;
      const seconds = RELICS.rot.seconds ?? 4;
      m.rot = Math.min(stacks, (m.rotT > 0 ? m.rot : 0) + 1);
      m.rotT = seconds;
    }
    if (this.has('chill')) {
      const cSlow = RELICS.chill.slow ?? 0.65;
      const cSec = RELICS.chill.seconds ?? 2.5;
      const on = m.slowT > 0;
      m.slow = on ? Math.min(m.slow, cSlow) : cSlow;
      m.slowT = Math.max(on ? m.slowT : 0, cSec);
    }
  }

  quake(x: number, y: number, z: number): void {
    if (!this.has('quake')) return;
    const radius = RELICS.quake.radius ?? 3;
    const mult = RELICS.quake.mult ?? 0.7;
    this.ring('quake', x, y, z, radius);
    this.area(x, z, radius, mult);
  }

  felled(m: MonsterEntity): void {
    const g = this.game;
    const p = g.player;
    if (this.has('rush')) p.rush = RELICS.rush.seconds ?? 3;
    if (this.has('spore') && !m.boss) {
      const radius = RELICS.spore.radius ?? 2.6;
      const mult = RELICS.spore.mult ?? 0.9;
      const x = m.x;
      const y = m.y;
      const z = m.z;
      g.skills.later(0.14, () => {
        this.ring('spore', x, y, z, radius);
        this.area(x, z, radius, mult, m);
      });
    }
  }

  struck(m: MonsterEntity): void {
    const g = this.game;
    const p = g.player;
    const reach = RELICS.thorn.reach ?? 5;
    const every = RELICS.thorn.every ?? 1.2;
    const mult = RELICS.thorn.mult ?? 0.8;
    const shove = RELICS.thorn.shove ?? 6;
    if (!this.has('thorn') || this.thornCd > 0 || !m || m.kind !== 'monster' || m.dead) return;
    const dx = m.x - p.x;
    const dz = m.z - p.z;
    const d = Math.hypot(dx, dz) || 1;
    if (d > reach + m.radius) return;
    this.thornCd = every;
    this.ring('thorn', p.x, p.y, p.z, 2.2);
    g.combat.strike(m, mult, 0, false, true);
    if (!m.dead && !m.def.giant && !m.guard && m.ai.state !== 'special') {
      applyKnockback(m, (dx / d) * shove, (dz / d) * shove);
    }
  }

  vigil(): boolean {
    const g = this.game;
    const p = g.player;
    const health = RELICS.vigil.health ?? 0.3;
    const seconds = RELICS.vigil.seconds ?? 3;
    if (!this.has('vigil') || p.vigilUsed || !g.missions.active) return false;
    p.vigilUsed = true;
    const nextHp = Math.max(p.hp, Math.round(p.maxHp * health));
    const healed = Math.max(0, Math.round(nextHp - p.hp));
    p.hp = nextHp;
    p.invuln = Math.max(p.invuln, seconds);
    this.ring('vigil', p.x, p.y, p.z, 4.5, true);
    g.bus.emit('heal', { entity: p, amount: healed });
    g.bus.emit('miss', { target: p, text: 'Last Light' });
    g.bus.emit('log', {
      text: '<b class="c-relic">Last Light</b> held. It will not hold again on this contract.',
    });
    return true;
  }

  private landed(): void {
    const g = this.game;
    const p = g.player;
    const jumped = this.jumped;
    this.jumped = false;
    if (!jumped || !this.has('meteor') || this.meteorCd > 0 || p.dead) return;
    const every = RELICS.meteor.every ?? 4;
    const radius = RELICS.meteor.radius ?? 3.2;
    const mult = RELICS.meteor.mult ?? 1.6;
    this.meteorCd = every;
    this.ring('meteor', p.x, p.y, p.z, radius, true);
    this.area(p.x, p.z, radius, mult);
  }

  leap(m: MonsterEntity, mult: number): void {
    if (!this.has('wick')) return;
    const g = this.game;
    const reach = RELICS.wick.reach ?? 6;
    const leaps = RELICS.wick.leaps ?? 2;
    const near = g.monsters
      .filter((o) => o !== m && !o.dead && Math.hypot(o.x - m.x, o.z - m.z) <= reach + o.radius)
      .sort((a, b) => Math.hypot(a.x - m.x, a.z - m.z) - Math.hypot(b.x - m.x, b.z - m.z))
      .slice(0, leaps);
    for (const o of near) {
      g.bus.emit('relic:leap', { x: o.x, y: o.y + o.height * 0.5, z: o.z });
      g.combat.strike(o, mult, 0, false, true);
    }
  }

  drop(m: MonsterEntity): void {
    const g = this.game;
    const s = g.player.sheet;
    const a = g.missions.active;
    const pool = relicsOf(m.defId);
    if (!pool.length || !a || a.offer.first) return;
    // every depth below the contract counts as another rank of threat
    const rank = (g.missions.threat?.rank ?? a.offer.threat ?? 0) + Math.max(0, (a.offer.depth || 1) - 1);
    if (rand() >= relicChance(rank, s.relicDry || 0)) {
      s.relicDry = (s.relicDry || 0) + 1;
      return;
    }
    s.relicDry = 0;
    const found = s.relics || {};
    const fresh = pool.filter((r) => !found[r.id]);
    const from = fresh.length && (fresh.length === pool.length || rand() < 0.75) ? fresh : pool;
    const item = rollItem({
      relic: from[Math.floor(rand() * from.length)].id,
      ilvl: m.level,
      cls: s.cls,
    });
    g.loot.dropGear(m.x, m.y, m.z, item);
  }
}
