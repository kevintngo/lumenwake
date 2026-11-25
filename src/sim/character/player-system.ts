import { GAME } from '../../config';
import { damp, dampAngle } from '../../core/math';
import { FAMILIES } from '../../data/classes';
import { BASES } from '../../data/gear';
import { RELICS } from '../../data/relics';
import { SITES } from '../../data/sites';
import type { EquipSlot, RgbTuple } from '../../types/domain';
import type { MonsterEntity, NpcEntity, PendingAttack, PlayerEntity, SiteEntity } from '../../types/entity';
import type { GameContext, SimSystem } from '../../types/game-context';
import { launchShot } from '../combat/skills-system';
import { dirFromYaw, yawFromDir } from '../entities';

const SWING = 0.42;
const HIT_AT = 0.45;
const SABER_TRAIL: RgbTuple = [0.42, 0.8, 1.0];
const CADENCE = 10.4;
const out = { x: 0, z: 0 };

const velocities = new WeakMap<PlayerEntity, { vx: number; vz: number }>();

export function getPlayerVelocity(player: PlayerEntity): { vx: number; vz: number } {
  return velocities.get(player) ?? { vx: 0, vz: 0 };
}

export class PlayerSystem implements SimSystem {
  private readonly game: GameContext;
  private stuck = 0;
  private safeT = 0;
  private hasSafe = false;

  constructor(game: GameContext) {
    this.game = game;
    game.bus.on('zone', () => {
      const p = game.player;
      p.aloft = false;
      p.air = 0;
      p.vy = 0;
      p.lift = 0;
      p.safeX = game.world.spec.start.x;
      p.safeZ = game.world.spec.start.z;
      this.hasSafe = false;
      this.safeT = 0;
    });
  }

  update(dt: number): void {
    const g = this.game;
    const p = g.player;
    const w = g.world;
    const it = p.intent;
    p.flash = Math.max(0, p.flash - dt * 5);
    p.invuln = Math.max(0, p.invuln - dt);
    if (p.dead) {
      this.updateDead(dt);
      return;
    }

    if (p.action) {
      const before = p.actionT;
      p.actionT += dt / p.actionDur;
      if (p.pending && before < p.pending.t && p.actionT >= p.pending.t) {
        const hit = p.pending;
        p.pending = null;
        this.resolveSwing(hit);
      }
      if (p.actionT >= 1) {
        p.action = 0;
        p.pending = null;
      }
    }

    p.attackCd -= dt;
    p.chainT = (p.chainT || 0) - dt;
    const fam = FAMILIES[p.family] || FAMILIES.blade;
    const reach = fam.range;
    const worn = p.sheet.equip;
    const look = (slot: EquipSlot): number => {
      const item = worn[slot];
      return item && BASES[item.base] ? BASES[item.base].look || 0 : 0;
    };
    p.kit = fam.kit + 0.1 * (p.action === 1 ? p.chain || 0 : 0) + 0.5 * look('weapon');
    p.extra = (p.build ?? Math.round(p.extra)) + 0.1 * look('frame') + 0.01 * look('unit');
    const has = (slot: EquipSlot): number => {
      const item = worn[slot];
      return item && BASES[item.base] ? 1 + (BASES[item.base].look || 0) : 0;
    };
    p.wears = has('offhand') + 4 * (has('grips') + 3 * has('boots'));

    const rushMul = p.rush > 0 ? 1 + (RELICS.rush.speed ?? 0.2) : 1;
    const speed = GAME.PLAYER_SPEED * (p.speedMul || 1) * rushMul;
    let dx = 0;
    let dz = 0;
    let want = 0;
    const tgt = p.target && !p.target.gone && !p.target.dead ? p.target : (p.target = null);

    if (p.dash) {
      p.dash.t -= dt;
      dx = p.dash.dirx * p.dash.speed;
      dz = p.dash.dirz * p.dash.speed;
      want = 1;
      if (p.dash.t <= 0) p.dash = null;
    } else if (it.moveX || it.moveZ) {
      dx = it.moveX * speed;
      dz = it.moveZ * speed;
      want = 1;
      p.moveTo = null;
      p.pursue = false;
    } else if (tgt && p.pursue) {
      const d = Math.hypot(tgt.x - p.x, tgt.z - p.z);
      const siteReach = tgt.kind === 'site' ? SITES[(tgt as SiteEntity).site].reach : 0.7;
      const stop =
        tgt.kind === 'monster'
          ? reach + tgt.radius - 0.25
          : tgt.kind === 'npc'
            ? 2.3
            : tgt.kind === 'site'
              ? siteReach - 0.5
              : 0.7;
      if (d > stop) {
        dx = ((tgt.x - p.x) / d) * speed;
        dz = ((tgt.z - p.z) / d) * speed;
        want = 1;
      }
    } else if (p.moveTo) {
      const d = Math.hypot(p.moveTo.x - p.x, p.moveTo.z - p.z);
      if (d < 0.25) p.moveTo = null;
      else {
        const s = Math.min(speed, d / dt);
        dx = ((p.moveTo.x - p.x) / d) * s;
        dz = ((p.moveTo.z - p.z) / d) * s;
        want = 1;
      }
    }

    if (p.action === 1 && p.actionT < 0.55 && !p.dash) {
      dx *= 0.25;
      dz *= 0.25;
    }

    if (it.jump) {
      it.jump = false;
      if (!p.aloft && !p.dash) {
        p.aloft = true;
        p.air = 0;
        p.vy = GAME.JUMP_SPEED;
        if (!p.action) {
          p.action = 5;
          p.actionT = 0;
          p.actionDur = (2 * GAME.JUMP_SPEED) / (GAME.GRAVITY * (w.biome().gravity || 1));
        }
        g.bus.emit('jump', { entity: p, x: p.x, y: p.y, z: p.z });
      }
    }

    const air = !!p.aloft;
    const px = p.x;
    const pz = p.z;
    if (want) {
      w.moveCircle(p.x, p.z, dx * dt, dz * dt, p.radius, out, air ? p.y + p.air : undefined);
      p.x = out.x;
      p.z = out.z;
      const moved = Math.hypot(p.x - px, p.z - pz);
      if (moved < Math.hypot(dx, dz) * dt * 0.25) {
        this.stuck += dt;
        if (this.stuck > 0.6) {
          p.moveTo = null;
          this.stuck = 0;
        }
      } else {
        this.stuck = 0;
      }
      if (moved > 1e-4 && !(p.action === 1 && tgt)) {
        p.yaw = dampAngle(p.yaw, yawFromDir(p.x - px, p.z - pz), 16, dt);
      }
      if (!p.dash && !air) {
        const pace = moved / Math.max(dt, 1e-4);
        const before = p.walk;
        p.walk += moved * Math.min(4.5, Math.max(1.9, CADENCE / Math.max(pace, 0.1)));
        if (Math.floor(before / Math.PI) !== Math.floor(p.walk / Math.PI)) {
          g.bus.emit('step', { entity: p });
        }
      }
    }

    const invDt = 1 / Math.max(dt, 1e-4);
    const vel = velocities.get(p);
    const vx = (p.x - px) * invDt;
    const vz = (p.z - pz) * invDt;
    if (vel) {
      vel.vx = vx;
      vel.vz = vz;
    } else {
      velocities.set(p, { vx, vz });
    }
    const movedNow = Math.hypot(p.x - px, p.z - pz) * invDt;
    p.move = damp(p.move, Math.min(1, movedNow / (GAME.PLAYER_SPEED * 0.8)), 14, dt);

    if (p.aloft) {
      p.vy -= GAME.GRAVITY * (w.biome().gravity || 1) * dt;
      p.air += p.vy * dt;
      const feet = p.y + p.air;
      const floor = w.nav.inside(p.x, p.z, 0.05) ? w.surface(p.x, p.z) : -1e3;
      if (p.vy <= 0 && feet <= floor) {
        p.y = floor;
        p.aloft = false;
        p.air = 0;
        p.vy = 0;
        p.lift = 0;
        if (p.action === 5) p.action = 0;
        g.bus.emit('landed', { entity: p, x: p.x, y: p.y, z: p.z });
      } else if (p.air < -5 || feet < 0.8) {
        this.fell();
      } else {
        p.lift = p.air;
      }
    } else {
      const ground = w.surface(p.x, p.z);
      if (ground < p.y - 0.7) {
        p.aloft = true;
        p.air = p.y - ground;
        p.y = ground;
        p.vy = 0;
        p.lift = p.air;
      } else {
        p.y = damp(p.y, ground, 22, dt);
      }
      if ((this.safeT -= dt) <= 0 && w.nav.inside(p.x, p.z, 1.0)) {
        this.safeT = 0.25;
        p.safeX = p.x;
        p.safeZ = p.z;
        this.hasSafe = true;
      }
    }

    if (tgt) {
      const d = Math.hypot(tgt.x - p.x, tgt.z - p.z);
      if (tgt.kind === 'monster') {
        if (d <= reach + tgt.radius + 0.15 && (p.pursue || !want)) {
          p.yaw = dampAngle(p.yaw, yawFromDir(tgt.x - p.x, tgt.z - p.z), 18, dt);
          if (p.attackCd <= 0 && !p.action) this.swing(tgt as MonsterEntity);
        }
      } else if (tgt.kind === 'npc' && d <= 2.6) {
        p.yaw = yawFromDir(tgt.x - p.x, tgt.z - p.z);
        tgt.yaw = yawFromDir(p.x - tgt.x, p.z - tgt.z);
        p.target = null;
        p.pursue = false;
        g.bus.emit('npc:talk', tgt as NpcEntity);
      } else if (
        (tgt.kind === 'drop' && d <= 1.0) ||
        (tgt.kind === 'site' && d <= SITES[(tgt as SiteEntity).site].reach)
      ) {
        p.target = null;
        p.pursue = false;
      }
    }

    p.calm += dt;
    const rest = p.calm > 5 ? 4 : 1;
    p.hp = Math.min(p.maxHp, p.hp + p.hpRegen * rest * dt);
    p.focus = Math.min(p.maxFocus, p.focus + p.focusRegen * (p.calm > 5 ? 1.6 : 1) * dt);
    p.safe = !g.missions.active;
  }

  private fell(): void {
    const g = this.game;
    const p = g.player;
    const w = g.world;
    const ax = this.hasSafe ? p.safeX : w.spec.start.x;
    const az = this.hasSafe ? p.safeZ : w.spec.start.z;
    const loss = Math.round(p.maxHp * 0.12);
    p.x = ax;
    p.z = az;
    p.aloft = false;
    p.air = 0;
    p.vy = 0;
    p.lift = 0;
    p.action = 0;
    p.dash = null;
    p.moveTo = null;
    p.pursue = false;
    p.y = w.surface(p.x, p.z);
    p.hp = Math.max(1, p.hp - loss);
    p.invuln = Math.max(p.invuln, 1.2);
    g.bus.emit('fell', { entity: p });
    g.bus.emit('feel', { hurt: 0.8 });
    g.bus.emit('log', { text: `You slip into the cloud and are hauled back: ${loss} health.` });
  }

  private swing(tgt: MonsterEntity): void {
    const p = this.game.player;
    const fam = FAMILIES[p.family] || FAMILIES.blade;
    p.chain = p.chainT > 0 ? ((p.chain || 0) + 1) % 3 : 0;
    const last = p.chain === 2;
    const rushMul = p.rush > 0 ? 1 + (RELICS.rush.speed ?? 0.2) : 1;
    p.attackCd = (1 / (p.attackSpeed * rushMul)) * (last ? 1.25 : 1);
    p.chainT = p.attackCd + 0.55;
    p.calm = 0;
    if (!fam.shot) {
      p.action = 1;
      p.actionT = 0;
      p.actionDur = SWING * (last ? 1.2 : 1);
    } else {
      p.action = 2;
      p.actionT = 0;
      p.actionDur = 0.3;
    }
    p.pending = { t: HIT_AT, target: tgt, chain: p.chain };
  }

  private resolveSwing(pending: PendingAttack): void {
    const g = this.game;
    const p = g.player;
    const fam = FAMILIES[p.family] || FAMILIES.blade;
    const mult = fam.chain[pending.chain] ?? 1;
    const last = pending.chain === 2;
    const tgt = pending.target;

    if (!fam.shot) {
      g.bus.emit('swing', {
        entity: p,
        radius: last ? 2.35 : 1.75,
        heavy: last,
        color: p.family === 'blade' ? SABER_TRAIL : undefined,
      });
      const reach = fam.range + (last ? 0.45 : 0);
      if (last) {
        const [fx, fz] = dirFromYaw(p.yaw);
        for (const m of g.monsters) {
          if (m.dead) continue;
          const dx = m.x - p.x;
          const dz = m.z - p.z;
          const d = Math.hypot(dx, dz);
          if (d <= reach + m.radius + 0.7 && (d < 0.6 || (dx * fx + dz * fz) / d > 0.15)) {
            g.combat.strike(m, mult);
          }
        }
        const near = !!tgt && Math.hypot(tgt.x - p.x, tgt.z - p.z) <= reach + tgt.radius + 0.7;
        g.relics.quake(near && tgt ? tgt.x : p.x + fx * 1.4, p.y, near && tgt ? tgt.z : p.z + fz * 1.4);
      } else if (tgt && !tgt.dead && Math.hypot(tgt.x - p.x, tgt.z - p.z) <= reach + tgt.radius + 0.7) {
        g.combat.strike(tgt, mult);
      }
      return;
    }

    if (!tgt || tgt.dead) return;
    const dx = tgt.x - p.x;
    const dz = tgt.z - p.z;
    const d = Math.hypot(dx, dz) || 1;
    const s = fam.shot;
    g.bus.emit('shoot', { entity: p, family: p.family, heavy: last });
    launchShot(
      g.skills,
      {
        x: p.x + (dx / d) * 0.6,
        y: p.y + 0.95,
        z: p.z + (dz / d) * 0.6,
        vx: (dx / d) * s.speed,
        vy: 0,
        vz: (dz / d) * s.speed,
        life: s.life,
        radius: s.radius,
        color: s.color,
        size: s.size * (last ? 1.35 : 1),
        mult,
        flat: 0,
        splash: s.splash && last ? s.splash : 0,
        splashMult: 0.6,
        quiet: true,
      },
      (m) => {
        g.combat.strike(m, mult);
        if (last) g.relics.quake(m.x, m.y, m.z);
      },
    );
  }

  private updateDead(dt: number): void {
    const g = this.game;
    const p = g.player;
    p.grow = Math.max(0, p.grow - dt * 3);
    p.move = 0;
    p.respawnT -= dt;
    g.bus.emit('fade', p.respawnT < 1.2 ? 0 : 1);
    if (p.respawnT <= 0) {
      p.hp = p.maxHp;
      p.focus = p.maxFocus * 0.5;
      p.dead = false;
      p.grow = 1;
      p.invuln = 2;
      p.calm = 10;
      g.bus.emit('fade', 1);
      g.bus.emit('player:respawn');
    }
  }
}
