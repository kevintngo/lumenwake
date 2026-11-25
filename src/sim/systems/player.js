// The player's body: moving, auto-attacking the chosen target, interacting,
// recovering, and coming back at a waystone. It acts on `player.intent`, which
// the Controls system fills in — so a replay, a bot or a network peer could
// drive the same code.

import { GAME, WORLD } from '../../config.js';
import { damp, dampAngle } from '../../core/math.js';
import { yawFromDir, dirFromYaw } from '../entities.js';
import { FAMILIES } from '../../content/classes.js';
import { BASES } from '../../content/gear.js';

const SWING = 0.42, HIT_AT = 0.45;
const CADENCE = 10.4;      // radians of stride a second: about 1.65 full cycles
const out = { x: 0, z: 0 };

export class PlayerSystem {
  constructor(game) {
    this.game = game;
    this.stuck = 0;
    this.siteName = '';
    // a new place: on the ground, with nowhere yet to be put back to
    game.bus.on('zone', () => { Object.assign(game.player, { aloft: false, air: 0, vy: 0, lift: 0, safeAt: null }); this.safeT = 0; });
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
    // what the picture needs to know: which weapon is in the hand and which of its family's shapes it is, which
    // step of the chain it is on, and what is worn: the frame, the unit on the back (gfx/glsl/held.js reads these)
    const worn = p.sheet.equip || {}, look = (slot) => (worn[slot] && BASES[worn[slot].base] ? BASES[worn[slot].base].look || 0 : 0);
    p.kit = fam.kit + 0.1 * (p.action === 1 ? p.chain || 0 : 0) + 0.5 * look('weapon');
    p.extra = (p.build ?? Math.round(p.extra)) + 0.1 * look('frame') + 0.01 * look('unit');

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
      const stop = tgt.kind === 'monster' ? REACH + tgt.radius - 0.25 : tgt.kind === 'npc' ? 2.3 : tgt.kind === 'site' ? tgt.reach - 0.5 : 0.7;
      if (d > stop) { dx = (tgt.x - p.x) / d * speed; dz = (tgt.z - p.z) / d * speed; want = 1; }
    } else if (p.moveTo) {
      const d = Math.hypot(p.moveTo.x - p.x, p.moveTo.z - p.z);
      if (d < 0.25) p.moveTo = null;
      else { const s = Math.min(speed, d / dt); dx = (p.moveTo.x - p.x) / d * s; dz = (p.moveTo.z - p.z) / d * s; want = 1; }
    }
    // rooted for the first beat of a swing so blows feel planted
    if (p.action === 1 && p.actionT < 0.55 && !p.dash) { dx *= 0.25; dz *= 0.25; }

    // a jump: straight up off the ground, steered in the air as on it
    if (it.jump) {
      it.jump = false;
      if (!p.aloft && !p.dash) {
        p.aloft = true; p.air = 0; p.vy = GAME.JUMP_SPEED;
        if (!p.action) { p.action = 5; p.actionT = 0; p.actionDur = 2 * GAME.JUMP_SPEED / (GAME.GRAVITY * (w.biome().gravity || 1)); }
        g.bus.emit('jump', { entity: p, x: p.x, y: p.y, z: p.z });
      }
    }
    const air = !!p.aloft;
    const px = p.x, pz = p.z;
    if (want) {
      w.moveCircle(p.x, p.z, dx * dt, dz * dt, p.radius, out, air ? p.y + p.air : undefined);
      p.x = out.x; p.z = out.z;
      const moved = Math.hypot(p.x - px, p.z - pz);
      // walking into something: give up on a click-move rather than grind against it
      if (moved < Math.hypot(dx, dz) * dt * 0.25) { this.stuck += dt; if (this.stuck > 0.6) { p.moveTo = null; this.stuck = 0; } } else this.stuck = 0;
      if (moved > 1e-4 && !(p.action === 1 && tgt)) p.yaw = dampAngle(p.yaw, yawFromDir(p.x - px, p.z - pz), 16, dt);
      // The stride: legs turn over about 1.65 times a second whatever the pace, so a
      // step is as long as the ground it covers (a stroll takes short steps, a run long
      // ones) and the feet do not slide. A dash is a single held lunge, not a run.
      if (!p.dash && !air) {
        const pace = moved / Math.max(dt, 1e-4);
        const before = p.walk;
        p.walk += moved * Math.min(4.5, Math.max(1.9, CADENCE / Math.max(pace, 0.1)));
        if (Math.floor(before / Math.PI) !== Math.floor(p.walk / Math.PI)) g.bus.emit('step', { entity: p, water: wet });
      }
    }
    p.vx = (p.x - px) / Math.max(dt, 1e-4); p.vz = (p.z - pz) / Math.max(dt, 1e-4);        // (what throws things at the hero leads him by this)
    const movedNow = Math.hypot(p.x - px, p.z - pz) / Math.max(dt, 1e-4);
    p.move = damp(p.move, Math.min(1, movedNow / (GAME.PLAYER_SPEED * 0.8)), 14, dt);
    if (p.aloft) {
      // in the air: the feet are p.air above where the jump began (p.y), and come down on whatever floor is under them
      p.vy -= GAME.GRAVITY * (w.biome().gravity || 1) * dt;          // (a place may pull less: content/themes.js)
      p.air += p.vy * dt;
      const feet = p.y + p.air, floor = w.nav.inside(p.x, p.z, 0.05) ? w.surface(p.x, p.z) : -1e3;      // (over the cloud there is no floor)
      if (p.vy <= 0 && feet <= floor) {
        p.y = floor; p.aloft = false; p.air = 0; p.vy = 0; p.lift = 0;
        if (p.action === 5) p.action = 0;
        g.bus.emit('landed', { x: p.x, y: p.y, z: p.z });
      } else if (p.air < -5 || feet < 0.8) this.fell();          // well below where the jump began, or down in the cloud
      else p.lift = p.air;
    } else {
      const ground = w.surface(p.x, p.z);
      if (ground < p.y - 0.7) { p.aloft = true; p.air = p.y - ground; p.y = ground; p.vy = 0; p.lift = p.air; }      // stepped off a terrace: it is a fall, not a slide
      else p.y = damp(p.y, ground, 22, dt);
      // somewhere to be put back if a jump goes wrong: the last ground stood on, well in from any edge
      if ((this.safeT = (this.safeT || 0) - dt) <= 0 && w.nav.inside(p.x, p.z, 1.0)) { this.safeT = 0.25; p.safeAt = { x: p.x, z: p.z }; }
    }

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
      } else if ((tgt.kind === 'drop' && d <= 1.0) || (tgt.kind === 'site' && d <= tgt.reach)) {
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

  /** Came down where there is no ground: back to the last ground stood on, shaken. */
  fell() {
    const g = this.game, p = g.player, w = g.world, at = p.safeAt || w.spec.start;
    const loss = Math.round(p.maxHp * 0.12);
    Object.assign(p, { x: at.x, z: at.z, aloft: false, air: 0, vy: 0, lift: 0, action: 0, dash: null, moveTo: null, pursue: false });
    p.y = w.surface(p.x, p.z);
    p.hp = Math.max(1, p.hp - loss);
    p.invuln = Math.max(p.invuln, 1.2);
    g.bus.emit('fell', { x: p.x, y: p.y, z: p.z, loss });
    g.bus.emit('feel', { hurt: 0.8 });
    g.bus.emit('log', { text: `You slip into the cloud and are hauled back: ${loss} health.` });
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
