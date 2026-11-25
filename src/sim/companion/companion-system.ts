import { damp, dampAngle } from '../../core/math';
import { FOODS, LUMENS, type LumenDef } from '../../data/lumens';
import { RELICS } from '../../data/relics';
import type { ItemId, LumenId, RgbTuple, TemperId } from '../../types/domain';
import type { MonsterEntity, PetEntity } from '../../types/entity';
import type { GameEventMap } from '../../types/events';
import type { CompanionLike, GameContext } from '../../types/game-context';
import type { LumenState } from '../../types/sheet';
import { derive } from '../character/stats';
import { launchShot } from '../combat/skills-system';
import { dirFromYaw, makeEntity, pencils } from '../entities';
import { lumenGrown, lumenKind, lumenLevel } from './lumen-math';

const ASSIST_EVERY = 2.6;
const FULL = 100;
const TEMPER_KEYS: readonly TemperId[] = ['ember', 'shell', 'tide'];

export class Companion implements CompanionLike {
  private readonly game: GameContext;
  e: PetEntity | null = null;
  private cd = ASSIST_EVERY;

  constructor(game: GameContext) {
    this.game = game;
    game.bus.on('zone', () => this.arrive());
    game.bus.on('class', () => this.dress());
    game.bus.on('damage', (d) => this.fill(d));
  }

  private get lumen(): LumenState {
    return this.game.player.sheet.lumen;
  }

  private get def(): LumenDef {
    return LUMENS[this.kind()];
  }

  kind(): LumenId {
    const id = this.lumen.kind;
    return id in LUMENS ? id : 'mote';
  }

  arrive(): void {
    const g = this.game;
    const p = g.player;
    const L = this.def;
    this.e = g.entities.add(
      makeEntity<PetEntity>('pet', 'lumen', {
        x: p.x - 0.7,
        z: p.z + 0.5,
        y: p.y + 1.45,
        radius: 0.3,
        height: 0.5,
        extra: L.shape,
        colors: pencils(L.colors),
        name: L.name,
        far: true,
      }),
    );
    this.cd = ASSIST_EVERY;
  }

  private dress(): void {
    const e = this.e;
    const L = this.def;
    if (!e) return;
    e.extra = L.shape;
    e.colors = pencils(L.colors);
    e.name = L.name;
  }

  update(dt: number): void {
    const g = this.game;
    const p = g.player;
    const e = this.e;
    const l = this.lumen;
    if (!e || e.gone) return;
    e.grow = p.grow > 0.5 && !p.hidden && !p.dead ? Math.min(1, e.grow + dt * 4) : 0;
    const [fx, fz] = dirFromYaw(p.yaw);
    const tx = p.x - fx * 0.5 + fz * 0.72;
    const tz = p.z - fz * 0.5 - fx * 0.72;
    const ty = p.y + (p.lift || 0) + 1.5;
    if (Math.hypot(tx - e.x, tz - e.z) > 14) {
      e.x = tx;
      e.z = tz;
      e.y = ty;
    }
    e.x = damp(e.x, tx, 5.5, dt);
    e.z = damp(e.z, tz, 5.5, dt);
    e.y = damp(e.y, ty, 7, dt);
    e.yaw = dampAngle(e.yaw, p.yaw, 6, dt);
    e.move = l.charge / FULL;
    if (e.action) {
      e.actionT += dt / e.actionDur;
      if (e.actionT >= 1) e.action = 0;
    }
    this.cd -= dt;
    const t = p.target;
    if (
      this.cd <= 0 &&
      t &&
      t.kind === 'monster' &&
      !t.dead &&
      !p.dead &&
      Math.hypot(t.x - p.x, t.z - p.z) < 13
    ) {
      this.cd = ASSIST_EVERY * (g.relics.has('wick') ? RELICS.wick.pace ?? 0.5 : 1);
      this.bolt(t as MonsterEntity, 0.22 + 0.006 * l.ember, 0.3);
      g.bus.emit('lumen:bolt', { x: e.x, y: e.y, z: e.z });
    }
  }

  bolt(t: MonsterEntity, mult: number, size = 0.3): void {
    const g = this.game;
    const e = this.e;
    if (!e) return;
    const dx = t.x - e.x;
    const dz = t.z - e.z;
    const d = Math.hypot(dx, dz) || 1;
    const c = e.colors[1];
    const color: RgbTuple = [c[0], c[1], c[2]];
    launchShot(
      g.skills,
      {
        x: e.x,
        y: e.y - 0.3,
        z: e.z,
        vx: (dx / d) * 17,
        vy: 0,
        vz: (dz / d) * 17,
        life: 1.0,
        radius: 0.4,
        size,
        mult,
        flat: 0,
        splash: 0,
        splashMult: 0,
        quiet: true,
        color,
      },
      (m) => {
        g.combat.strike(m, mult, 0, false, true);
        g.relics.leap(m, mult);
      },
    );
  }

  private fill(d: GameEventMap['damage']): void {
    const g = this.game;
    const p = g.player;
    const l = this.lumen;
    if (!l || l.charge >= FULL) return;
    if (d.soft) return;
    if (d.target === p) l.charge += 6;
    else if (d.source === p && d.target.kind === 'monster') l.charge += d.crit ? 3.4 : 2.2;
    else return;
    if (l.charge >= FULL) {
      l.charge = FULL;
      g.bus.emit('lumen:ready');
    }
  }

  burst(): boolean {
    const g = this.game;
    const p = g.player;
    const l = this.lumen;
    const e = this.e;
    const b = this.def.burst;
    if (!e || p.dead || l.charge < FULL) {
      if (e && !p.dead) g.bus.emit('deny', {});
      return false;
    }
    l.charge = 0;
    const near = g.monsters
      .filter((m) => !m.dead)
      .map((m) => ({ m, d: Math.hypot(m.x - p.x, m.z - p.z) }))
      .sort((a, c) => a.d - c.d);
    if (b.kind === 'ring') {
      const r = b.r ?? 3.4;
      const mult = b.mult ?? 1.6;
      for (const { m, d } of near) {
        if (d < r + m.radius) g.combat.strike(m, mult, 0, true, true);
      }
    }
    if (b.kind === 'volley' || b.kind === 'all') {
      const marks = near.filter((n) => n.d < 16);
      const count = b.count ?? 3;
      const mult = b.mult ?? 1.2;
      for (let k = 0; k < count && marks.length; k++) {
        this.bolt(marks[k % marks.length].m, mult, 0.5);
      }
    }
    if (b.seconds) p.invuln = Math.max(p.invuln, b.seconds);
    let healed = 0;
    if (b.heal) {
      const next = Math.min(p.maxHp, p.hp + p.maxHp * b.heal);
      healed = Math.round(next - p.hp);
      p.hp = next;
    }
    if (b.focus) p.focus = Math.min(p.maxFocus, p.focus + p.maxFocus * b.focus);
    e.action = 2;
    e.actionT = 0;
    e.actionDur = 0.6;
    const c = e.colors[1];
    const color: RgbTuple = [c[0], c[1], c[2]];
    g.bus.emit('lumen:burst', { burst: b, x: p.x, y: p.y, z: p.z, color });
    if (b.heal) g.bus.emit('heal', { entity: p, amount: healed });
    return true;
  }

  feed(id: ItemId): boolean {
    const g = this.game;
    const p = g.player;
    const l = this.lumen;
    const food = (FOODS as Partial<Record<ItemId, Readonly<Partial<Record<TemperId, number>>>>>)[id];
    if (!food || g.loot.count(id) < 1) return false;
    if (lumenGrown(l)) {
      g.bus.emit('log', { text: 'Your lumen is full grown: it will not eat any more.' });
      return false;
    }
    g.loot.remove(id, 1);
    const before = lumenLevel(l);
    for (const t of TEMPER_KEYS) {
      const add = food[t];
      if (add) l[t] += add;
    }
    const level = lumenLevel(l);
    g.bus.emit('lumen:fed', { id });
    if (level !== before) {
      const kind = lumenKind(l);
      if (kind !== l.kind) {
        l.kind = kind;
        this.dress();
        const e = this.e;
        const c = e ? e.colors[1] : [1, 1, 1];
        const color: RgbTuple = [c[0], c[1], c[2]];
        g.bus.emit('lumen:changed', {
          kind,
          name: LUMENS[kind].name,
          x: e ? e.x : p.x,
          y: e ? e.y : p.y,
          z: e ? e.z : p.z,
          color,
        });
      } else {
        g.bus.emit('lumen:level', { level });
      }
    }
    derive(p);
    g.bus.emit('bag:changed');
    return true;
  }
}
