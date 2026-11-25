import { ABILITIES, type AbilityDef } from '../../data/abilities';
import { CLASSES, SLOT_UNLOCK } from '../../data/classes';
import { RELICS } from '../../data/relics';
import type { AbilityEffectId, ClassId, RgbTuple } from '../../types/domain';
import type { MonsterEntity, PlayerEntity, PlayerProjectile } from '../../types/entity';
import type { GameContext, SkillSlotEntry, SkillsLike } from '../../types/game-context';
import { rank } from '../character/talents';
import { dirFromYaw, yawFromDir } from '../entities';
import { applyKnockback } from './monster-specials';

interface SkillBarEntry extends SkillSlotEntry {
  key: string;
  unlock: number;
  effect: AbilityEffectId;
}

interface AimInfo {
  dirX: number;
  dirZ: number;
}

type ShotHitHook = (m: MonsterEntity) => void;
const shotHooks = new WeakMap<PlayerProjectile, ShotHitHook>();

const SABER_COLOR: RgbTuple = [0.42, 0.8, 1.0];

export function launchShot(
  skills: SkillsLike,
  shot: Omit<PlayerProjectile, 'gone'> & { gone?: boolean },
  onHit?: ShotHitHook,
): void {
  const proj = shot as PlayerProjectile;
  if (onHit) shotHooks.set(proj, onHit);
  skills.launch(proj);
}

const scale = (p: PlayerEntity, a: AbilityDef): number => (a.scales === 'power' ? p.power : 1);

const EFFECTS: Readonly<
  Record<AbilityEffectId, (g: GameContext, p: PlayerEntity, a: AbilityDef, aim: AimInfo, skills: Skills) => void>
> = {
  arc(g, p, a, aim, skills) {
    p.yaw = yawFromDir(aim.dirX, aim.dirZ);
    p.action = 1;
    p.actionT = 0;
    p.actionDur = 0.46;
    p.attackCd = 0.5;
    p.chain = 0;
    p.pending = null;
    const reach = (a.reach ?? 2.9) * (1 + 0.2 * rank(p.sheet, 'wide'));
    const force = (a.mult ?? 1.7) * (1 + 0.25 * rank(p.sheet, 'rend'));
    skills.later(0.46 * 0.45, () => {
      g.bus.emit('swing', {
        entity: p,
        radius: reach * 1.03,
        color: p.family === 'blade' ? SABER_COLOR : a.color,
        heavy: true,
      });
      g.bus.emit('feel', { shake: 0.35 });
      for (const m of g.monsters) {
        if (m.dead) continue;
        const dx = m.x - p.x;
        const dz = m.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d > reach + m.radius) continue;
        if (d > 0.6 && (dx * aim.dirX + dz * aim.dirZ) / d < -0.25) continue;
        g.combat.strike(m, force * scale(p, a));
      }
    });
  },

  ring(g, p, a) {
    p.action = 2;
    p.actionT = 0;
    p.actionDur = 0.5;
    const radius = a.radius ?? 3.6;
    const k = scale(p, a);
    g.bus.emit('slam', { x: p.x, y: p.y, z: p.z, r: radius, heavy: true });
    g.bus.emit('feel', { shake: 0.4 });
    for (const m of g.monsters) {
      if (m.dead) continue;
      const dx = m.x - p.x;
      const dz = m.z - p.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d > radius + m.radius) continue;
      g.combat.strike(m, (a.mult ?? 1) * k, (a.flat || 0) * k);
      if (a.shove && !m.dead) applyKnockback(m, (dx / d) * a.shove, (dz / d) * a.shove);
      if (a.slow && !m.dead) {
        m.slow = a.slow.factor;
        m.slowT = a.slow.seconds;
      }
    }
  },

  bolt(_g, p, a, aim, skills) {
    p.yaw = yawFromDir(aim.dirX, aim.dirZ);
    p.action = 2;
    p.actionT = 0;
    p.actionDur = 0.36;
    const turns = a === ABILITIES.bolt && rank(p.sheet, 'twin') ? [-0.13, 0.13] : [0];
    for (const turn of turns) {
      const dx = aim.dirX * Math.cos(turn) - aim.dirZ * Math.sin(turn);
      const dz = aim.dirZ * Math.cos(turn) + aim.dirX * Math.sin(turn);
      skills.fire(p, dx, dz, a);
    }
  },

  volley(g, p, a, aim, skills) {
    const shots = a.shots ?? 4;
    const gap = a.gap ?? 0.09;
    p.yaw = yawFromDir(aim.dirX, aim.dirZ);
    p.action = 2;
    p.actionT = 0;
    p.actionDur = shots * gap + 0.2;
    for (let i = 0; i < shots; i++) {
      skills.later(i * gap, () => {
        const m = g.entities.nearest<MonsterEntity>('monster', p.x, p.z, 13, (e) => !e.dead);
        let dx = aim.dirX;
        let dz = aim.dirZ;
        if (m) {
          const d = Math.hypot(m.x - p.x, m.z - p.z) || 1;
          dx = (m.x - p.x) / d;
          dz = (m.z - p.z) / d;
          p.yaw = yawFromDir(dx, dz);
        }
        skills.fire(p, dx, dz, a, true);
      });
    }
  },

  heal(g, p, a) {
    const seconds = a.seconds ?? 3;
    const portion = a.portion ?? 0.34;
    const total = p.maxHp * portion * p.power * (1 + 0.33 * rank(p.sheet, 'roots'));
    p.action = 2;
    p.actionT = 0;
    p.actionDur = 0.5;
    p.mend = { t: seconds, rate: total / seconds };
    g.bus.emit('heal', { entity: p, amount: Math.round(total) });
  },

  dash(g, p, a, aim) {
    const speed = a.speed ?? 26;
    const seconds = a.seconds ?? 0.22;
    const invuln = a.invuln ?? 0.35;
    p.yaw = yawFromDir(aim.dirX, aim.dirZ);
    const far = 1 + 0.25 * rank(p.sheet, 'stride');
    const gust = rank(p.sheet, 'gust') > 0;
    p.dash = { dirx: aim.dirX, dirz: aim.dirZ, speed, t: seconds * far, hit: new Set<number>() };
    p.action = 4;
    p.actionT = 0;
    p.actionDur = (seconds + 0.02) * far;
    if (gust) {
      const len = speed * seconds * far;
      for (const m of g.monsters) {
        if (m.dead) continue;
        const mx = m.x - p.x;
        const mz = m.z - p.z;
        const along = mx * aim.dirX + mz * aim.dirZ;
        if (along > -0.5 && along < len + 0.8 && Math.abs(mx * aim.dirZ - mz * aim.dirX) < 1.3 + m.radius) {
          p.dash.hit.add(m.id);
          g.combat.strike(m, 1.2);
        }
      }
    }
    p.invuln = Math.max(p.invuln, invuln);
    p.moveTo = null;
    g.bus.emit('dash', { x: p.x, y: p.y, z: p.z });
  },
};

export class Skills implements SkillsLike {
  private readonly game: GameContext;
  cooldowns: number[] = [0, 0, 0, 0];
  private readonly shots: PlayerProjectile[] = [];
  private queue: { t: number; fn: () => void }[] = [];
  private cls: ClassId | '' = '';
  private bar: SkillBarEntry[] = [];

  constructor(game: GameContext) {
    this.game = game;
    game.bus.on('zone', () => {
      for (const s of this.shots) s.gone = true;
      this.shots.length = 0;
      this.queue.length = 0;
    });
  }

  list(): SkillBarEntry[] {
    const cls = this.game.player.sheet.cls;
    if (cls !== this.cls) {
      this.cls = cls;
      this.bar = CLASSES[cls].abilities.map((id, i) => {
        const a = ABILITIES[id];
        return {
          id,
          name: a.name,
          icon: a.icon,
          cooldown: a.cooldown,
          focus: a.focus,
          desc: a.desc,
          effect: a.effect,
          key: String(i + 1),
          unlock: SLOT_UNLOCK[i],
        };
      });
    }
    return this.bar;
  }

  unlocked(i: number): boolean {
    return this.game.player.sheet.level >= SLOT_UNLOCK[i];
  }

  cast(i: number): boolean {
    const g = this.game;
    const p = g.player;
    const s = this.list()[i];
    if (!s || p.dead || p.dash) return false;
    if (!this.unlocked(i)) {
      g.bus.emit('log', { text: `${s.name} opens at level ${s.unlock}.` });
      return false;
    }
    if (this.cooldowns[i] > 0) return false;
    const tide = s.id === 'step' && g.relics.has('tide');
    const thrift = Math.max(0.4, 1 - 0.12 * rank(p.sheet, 'thrift'));
    const cost = tide ? 0 : s.focus * thrift;
    if (p.focus < cost) {
      g.bus.emit('log', { text: 'Not enough focus.' });
      g.bus.emit('deny', {});
      return false;
    }
    const aim = this.aim();
    p.focus -= cost;
    this.cooldowns[i] =
      s.cooldown *
      (s.id === 'bolt' ? 1 - 0.2 * rank(p.sheet, 'tinder') : 1) *
      (tide ? RELICS.tide.cooldown ?? 0.5 : 1);
    p.calm = Math.min(p.calm, 2);
    EFFECTS[s.effect](g, p, ABILITIES[s.id], aim, this);
    g.bus.emit('skill', { id: s.id, index: i });
    return true;
  }

  private aim(): AimInfo {
    const g = this.game;
    const p = g.player;
    let tx: number | undefined;
    let tz: number | undefined;
    const t = p.target && p.target.kind === 'monster' && !p.target.dead ? (p.target as MonsterEntity) : null;
    if (t) {
      tx = t.x;
      tz = t.z;
    } else if (p.intent.aim) {
      tx = p.intent.aim.x;
      tz = p.intent.aim.z;
    } else {
      const m = g.entities.nearest<MonsterEntity>('monster', p.x, p.z, 11);
      if (m) {
        tx = m.x;
        tz = m.z;
      }
    }
    let dx = (tx ?? p.x) - p.x;
    let dz = (tz ?? p.z) - p.z;
    let d = Math.hypot(dx, dz);
    if (d < 0.2) {
      [dx, dz] = dirFromYaw(p.yaw);
      d = 1;
    }
    return { dirX: dx / d, dirZ: dz / d };
  }

  later(seconds: number, fn: () => void): void {
    this.queue.push({ t: seconds, fn });
  }

  fire(p: PlayerEntity, dx: number, dz: number, a: AbilityDef, quiet = false): void {
    const k = scale(p, a);
    const speed = a.speed ?? 17;
    const mult = (a.mult ?? 1) * k;
    const flat = (a.flat || 0) * k;
    this.launch({
      x: p.x + dx * 0.6,
      y: p.y + 0.95,
      z: p.z + dz * 0.6,
      vx: dx * speed,
      vy: 0,
      vz: dz * speed,
      life: a.life ?? 0.85,
      radius: a.radius ?? 0.4,
      color: a.color ?? [1, 1, 1],
      size: 0.55,
      mult,
      flat,
      splash: a.splash || 0,
      splashMult: (a.splashMult || 0) * k,
      quiet,
    });
  }

  launch(shot: Omit<PlayerProjectile, 'gone'> & { gone?: boolean }): void {
    const proj = shot as PlayerProjectile;
    proj.gone = false;
    this.shots.push(proj);
    this.game.bus.emit('shot:launch', proj);
  }

  update(dt: number): void {
    const g = this.game;
    const p = g.player;
    for (let i = 0; i < this.cooldowns.length; i++) {
      this.cooldowns[i] = Math.max(0, this.cooldowns[i] - dt);
    }
    p.potionCd = Math.max(0, p.potionCd - dt);
    if (p.mend) {
      p.hp = Math.min(p.maxHp, p.hp + p.mend.rate * dt);
      p.mend.t -= dt;
      if (p.mend.t <= 0) p.mend = null;
    }
    if (this.queue.length) {
      const due: { t: number; fn: () => void }[] = [];
      this.queue = this.queue.filter((q) => {
        q.t -= dt;
        if (q.t > 0) return true;
        due.push(q);
        return false;
      });
      if (!p.dead) {
        for (const q of due) q.fn();
      }
    }

    let w = 0;
    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.life -= dt;
      const ground = g.world.surface(s.x, s.z);
      let hit: MonsterEntity | null = null;
      let done = s.life <= 0 || ground > s.y - 0.1;
      for (const m of g.monsters) {
        if (m.dead) continue;
        if (Math.hypot(m.x - s.x, m.z - s.z) < m.radius + s.radius) {
          hit = m;
          break;
        }
      }
      if (!hit && !done) {
        g.world.forEachProp(s.x, s.z, 1, (pr) => {
          if (
            pr.def.collide > 0 &&
            Math.hypot(pr.x - s.x, pr.z - s.z) < pr.def.collide * pr.scale + 0.2 &&
            s.y < pr.y + pr.def.height * pr.scale
          ) {
            done = true;
          }
        });
      }
      if (hit) {
        const hook = shotHooks.get(s);
        if (hook) hook(hit);
        else g.combat.strike(hit, s.mult, s.flat);
        if (s.splash) {
          for (const m of g.monsters) {
            if (m !== hit && !m.dead && Math.hypot(m.x - s.x, m.z - s.z) < s.splash + m.radius) {
              g.combat.strike(m, s.splashMult, 0, false);
            }
          }
        }
        done = true;
      }
      if (done) {
        s.gone = true;
        g.bus.emit(s.quiet ? 'shot:hit' : 'bolt:hit', { x: s.x, y: s.y, z: s.z });
        continue;
      }
      this.shots[w++] = s;
    }
    this.shots.length = w;
  }
}
