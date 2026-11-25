// The player's body: moving, auto-attacking the chosen target, interacting,
// recovering, and coming back at a waystone. It acts on `player.intent`, which
// the Controls system fills in — so a replay, a bot or a network peer could
// drive the same code.

import { GAME, WORLD } from '../../config.js';
import { damp, dampAngle } from '../../core/math.js';
import { yawFromDir, dirFromYaw } from '../entities.js';
import { FAMILIES } from '../../content/classes.js';

const SWING = 0.42, HIT_AT = 0.45;
const CADENCE = 10.4;      // radians of stride a second: about 1.65 full cycles
const out = { x: 0, z: 0 };

export class PlayerSystem {
  constructor(game) {
    this.game = game;
    this.stuck = 0;
    this.siteName = '';
  }

  update(dt) {
    const g = this.game, p = g.player, w = g.world, it = p.intent;
    p.flash = Math.max(0, p.flash - dt * 5);
    p.invuln = Math.max(0, p.invuln - dt);
    if (p.dead) return this.updateDead(dt);

    // animation clock; the hit lands part-way through a swing
    if (p.action) {
      const before = p.actionT;
      p.actionT += dt / p.actionDur;
      if (p.pending && before < HIT_AT && p.actionT >= HIT_AT) { const hit = p.pending; p.pending = null; hit(); }
      if (p.actionT >= 1) { p.action = 0; p.pending = null; }
    }
    p.attackCd -= dt;
    p.chainT = (p.chainT || 0) - dt;
    const fam = FAMILIES[p.family] || FAMILIES.blade, REACH = fam.range;
    // what the picture needs to know: which weapon is in the hand, and which step of the chain it is on
    p.kit = fam.kit + 0.2 * (p.action === 1 ? p.chain || 0 : 0);

    const wet = w.waterDepth(p.x, p.z) > 0.18;
    const speed = GAME.PLAYER_SPEED * (wet ? 0.62 : 1) * (p.speedMul || 1);
    let dx = 0, dz = 0, want = 0;
    const tgt = p.target && !p.target.gone && !p.target.dead ? p.target : (p.target = null);

    if (p.dash) {
      p.dash.t -= dt;
      dx = p.dash.x * p.dash.speed; dz = p.dash.z * p.dash.speed; want = 1;
      if (p.dash.t <= 0) p.dash = null;
    } else if (it.moveX || it.moveZ) {
      dx = it.moveX * speed; dz = it.moveZ * speed; want = 1;
      p.moveTo = null; p.pursue = false;
    } else if (tgt && p.pursue) {
      const d = Math.hypot(tgt.x - p.x, tgt.z - p.z);
      const stop = tgt.kind === 'monster' ? REACH + tgt.radius - 0.25 : tgt.kind === 'npc' ? 2.3 : 0.7;
      if (d > stop) { dx = (tgt.x - p.x) / d * speed; dz = (tgt.z - p.z) / d * speed; want = 1; }
    } else if (p.moveTo) {
      const d = Math.hypot(p.moveTo.x - p.x, p.moveTo.z - p.z);
      if (d < 0.25) p.moveTo = null;
      else { const s = Math.min(speed, d / dt); dx = (p.moveTo.x - p.x) / d * s; dz = (p.moveTo.z - p.z) / d * s; want = 1; }
    }
    // rooted for the first beat of a swing so blows feel planted
    if (p.action === 1 && p.actionT < 0.55 && !p.dash) { dx *= 0.25; dz *= 0.25; }

    const px = p.x, pz = p.z;
    if (want) {
      w.moveCircle(p.x, p.z, dx * dt, dz * dt, p.radius, out);
      p.x = out.x; p.z = out.z;
      const moved = Math.hypot(p.x - px, p.z - pz);
      // walking into something: give up on a click-move rather than grind against it
      if (moved < Math.hypot(dx, dz) * dt * 0.25) { this.stuck += dt; if (this.stuck > 0.6) { p.moveTo = null; this.stuck = 0; } } else this.stuck = 0;
      if (moved > 1e-4 && !(p.action === 1 && tgt)) p.yaw = dampAngle(p.yaw, yawFromDir(p.x - px, p.z - pz), 16, dt);
      // The stride: legs turn over about 1.65 times a second whatever the pace, so a
      // step is as long as the ground it covers (a stroll takes short steps, a run long
      // ones) and the feet do not slide. A dash is a single held lunge, not a run.
      if (!p.dash) {
        const pace = moved / Math.max(dt, 1e-4);
        const before = p.walk;
        p.walk += moved * Math.min(4.5, Math.max(1.9, CADENCE / Math.max(pace, 0.1)));
        if (Math.floor(before / Math.PI) !== Math.floor(p.walk / Math.PI)) g.bus.emit('step', { entity: p, water: wet });
      }
    }
    p.vx = (p.x - px) / Math.max(dt, 1e-4); p.vz = (p.z - pz) / Math.max(dt, 1e-4);        // (what throws things at the hero leads him by this)
    const movedNow = Math.hypot(p.x - px, p.z - pz) / Math.max(dt, 1e-4);
    p.move = damp(p.move, Math.min(1, movedNow / (GAME.PLAYER_SPEED * 0.8)), 14, dt);
    p.y = damp(p.y, w.surface(p.x, p.z) - (wet ? 0.12 : 0), 22, dt);

    // act on the target once in reach
    if (tgt) {
      const d = Math.hypot(tgt.x - p.x, tgt.z - p.z);
      if (tgt.kind === 'monster') {
        if (d <= REACH + tgt.radius + 0.15 && (p.pursue || !want)) {
          p.yaw = dampAngle(p.yaw, yawFromDir(tgt.x - p.x, tgt.z - p.z), 18, dt);
          if (p.attackCd <= 0 && !p.action) this.swing(tgt);
        }
      } else if (tgt.kind === 'npc' && d <= 2.6) {
        p.yaw = yawFromDir(tgt.x - p.x, tgt.z - p.z);
        tgt.yaw = yawFromDir(p.x - tgt.x, p.z - tgt.z);
        p.target = null; p.pursue = false;
        g.bus.emit('npc:talk', tgt);
      } else if (tgt.kind === 'drop' && d <= 1.0) {
        p.target = null; p.pursue = false;
      }
    }

    // recovery: slow in a fight, quick once things calm down
    p.calm += dt;
    const rest = p.calm > 5 ? 4 : 1;
    p.hp = Math.min(p.maxHp, p.hp + p.hpRegen * rest * dt);
    p.focus = Math.min(p.maxFocus, p.focus + p.focusRegen * (p.calm > 5 ? 1.6 : 1) * dt);

    p.safe = !g.missions.active;       // nothing hunts on the ship
  }

  /**
   * One attack of the chain. Three in time with each other, the third the heaviest; let the beat lapse and
   * the chain starts again. A blade cuts (the third cut takes everything in front); a rifle or a rod fires.
   */
  swing(tgt) {
    const g = this.game, p = g.player, fam = FAMILIES[p.family] || FAMILIES.blade;
    p.chain = p.chainT > 0 ? ((p.chain || 0) + 1) % 3 : 0;
    const mult = fam.chain[p.chain], last = p.chain === 2;
    p.attackCd = (1 / p.attackSpeed) * (last ? 1.25 : 1);
    p.chainT = p.attackCd + 0.55;
    p.calm = 0;
    if (!fam.shot) {
      p.action = 1; p.actionT = 0; p.actionDur = SWING * (last ? 1.2 : 1);
      p.pending = () => {
        g.bus.emit('swing', { entity: p, radius: last ? 2.35 : 1.75, heavy: last });
        const reach = fam.range + (last ? 0.45 : 0);
        if (last) {
          const [fx, fz] = dirFromYaw(p.yaw);
          for (const m of g.monsters) {
            if (m.dead) continue;
            const dx = m.x - p.x, dz = m.z - p.z, d = Math.hypot(dx, dz);
            if (d <= reach + m.radius + 0.7 && (d < 0.6 || (dx * fx + dz * fz) / d > 0.15)) g.combat.strike(m, mult);
          }
        } else if (!tgt.dead && Math.hypot(tgt.x - p.x, tgt.z - p.z) <= reach + tgt.radius + 0.7) g.combat.strike(tgt, mult);
      };
    } else {
      p.action = 2; p.actionT = 0; p.actionDur = 0.3;
      p.pending = () => {
        if (tgt.dead) return;
        const dx = tgt.x - p.x, dz = tgt.z - p.z, d = Math.hypot(dx, dz) || 1, s = fam.shot;
        g.bus.emit('shoot', { entity: p, family: p.family, heavy: last });
        g.skills.launch({
          x: p.x + dx / d * 0.6, y: p.y + 0.95, z: p.z + dz / d * 0.6, vx: dx / d * s.speed, vz: dz / d * s.speed,
          life: s.life, radius: s.radius, color: s.color, size: s.size * (last ? 1.35 : 1), quiet: true,
          onHit: (m) => g.combat.strike(m, mult), splash: s.splash && last ? s.splash : 0, splashMult: 0.6,
        });
      };
    }
  }

  updateDead(dt) {
    const g = this.game, p = g.player;
    p.grow = Math.max(0, p.grow - dt * 3);
    p.move = 0;
    p.respawn -= dt;
    g.bus.emit('fade', p.respawn < 1.2 ? 0 : 1);
    if (p.respawn <= 0) {
      // lifted out: the mission is over, and the hero wakes on the ship (systems/missions.js)
      p.hp = p.maxHp; p.focus = p.maxFocus * 0.5;
      p.dead = false; p.grow = 1; p.invuln = 2; p.calm = 10;
      g.bus.emit('fade', 1);
      g.bus.emit('player:respawn', { name: 'the Meridian' });
    }
  }
}

export { dirFromYaw };
