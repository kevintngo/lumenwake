// Abilities in use: the bar's cooldowns and costs, where an ability is aimed,
// the handful of effects every ability is made of, and the shots in flight.
// What each ability is lives in content/abilities.js; which four a class
// carries, in content/classes.js.

import { ABILITIES } from '../../content/abilities.js';
import { CLASSES, SLOT_UNLOCK } from '../../content/classes.js';
import { rank } from '../../content/talents.js';
import { dirFromYaw, yawFromDir } from '../entities.js';
import { RELICS } from '../../content/relics.js';

// How much an ability's numbers grow with the hero: [times attack, times flat]
const scale = (p, a) => (a.scales === 'power' ? p.power : 1);

// The kinds of thing an ability can do. (g: game, p: hero, a: the ability's row, aim: { x, z, dirX, dirZ, target })
const EFFECTS = {
  /** A wide cut: everything in front, within reach. */
  arc(g, p, a, aim) {
    p.yaw = yawFromDir(aim.dirX, aim.dirZ);
    p.action = 1; p.actionT = 0; p.actionDur = 0.46; p.attackCd = 0.5; p.chain = 0;
    const reach = a.reach * (1 + 0.2 * rank(p.sheet, 'wide')), force = a.mult * (1 + 0.25 * rank(p.sheet, 'rend'));
    p.pending = () => {
      g.bus.emit('swing', { entity: p, radius: reach * 1.03, color: p.family === 'blade' ? [0.42, 0.8, 1.0] : a.color, heavy: true });
      g.bus.emit('feel', { shake: 0.35 });
      for (const m of g.monsters) {
        if (m.dead) continue;
        const dx = m.x - p.x, dz = m.z - p.z, d = Math.hypot(dx, dz);
        if (d > reach + m.radius) continue;
        if (d > 0.6 && (dx * aim.dirX + dz * aim.dirZ) / d < -0.25) continue; // behind you
        g.combat.strike(m, force * scale(p, a));
      }
    };
  },
  /** A ring bursting out from the hero: strikes, and may shove or slow. */
  ring(g, p, a) {
    p.action = 2; p.actionT = 0; p.actionDur = 0.5;
    const k = scale(p, a);
    g.bus.emit('slam', { x: p.x, y: p.y, z: p.z, r: a.radius, heavy: true, friendly: true });
    g.bus.emit('feel', { shake: 0.4 });
    for (const m of g.monsters) {
      if (m.dead) continue;
      const dx = m.x - p.x, dz = m.z - p.z, d = Math.hypot(dx, dz) || 1;
      if (d > a.radius + m.radius) continue;
      g.combat.strike(m, a.mult * k, (a.flat || 0) * k);
      if (a.shove && !m.dead) { m.ai.pushX = dx / d * a.shove; m.ai.pushZ = dz / d * a.shove; }
      if (a.slow && !m.dead) m.slow = { k: a.slow.factor, t: a.slow.seconds };
    }
  },
  /** One mote thrown where the hero aims (two with Twin Embers), bursting on what it meets. */
  bolt(g, p, a, aim) {
    p.yaw = yawFromDir(aim.dirX, aim.dirZ);
    p.action = 2; p.actionT = 0; p.actionDur = 0.36;
    for (const turn of a === ABILITIES.bolt && rank(p.sheet, 'twin') ? [-0.13, 0.13] : [0]) {
      const dx = aim.dirX * Math.cos(turn) - aim.dirZ * Math.sin(turn), dz = aim.dirZ * Math.cos(turn) + aim.dirX * Math.sin(turn);
      g.skills.fire(p, dx, dz, a);
    }
  },
  /** Several quick shots, each at the nearest thing still standing. */
  volley(g, p, a, aim) {
    p.yaw = yawFromDir(aim.dirX, aim.dirZ);
    p.action = 2; p.actionT = 0; p.actionDur = a.shots * a.gap + 0.2;
    for (let i = 0; i < a.shots; i++) {
      g.skills.later(i * a.gap, () => {
        const m = g.entities.nearest('monster', p.x, p.z, 13, (e) => !e.dead);
        let dx = aim.dirX, dz = aim.dirZ;
        if (m) { const d = Math.hypot(m.x - p.x, m.z - p.z) || 1; dx = (m.x - p.x) / d; dz = (m.z - p.z) / d; p.yaw = yawFromDir(dx, dz); }
        g.skills.fire(p, dx, dz, a, true);
      });
    }
  },
  /** Health back over a few moments. */
  heal(g, p, a) {
    p.action = 2; p.actionT = 0; p.actionDur = 0.5;
    p.mend = { left: a.seconds, rate: p.maxHp * a.portion * p.power * (1 + 0.33 * rank(p.sheet, 'roots')) / a.seconds };
    g.bus.emit('heal', { entity: p });
  },
  /** A short dash, untouchable on the way. */
  dash(g, p, a, aim) {
    p.yaw = yawFromDir(aim.dirX, aim.dirZ);
    const far = 1 + 0.25 * rank(p.sheet, 'stride');
    p.dash = { x: aim.dirX, z: aim.dirZ, speed: a.speed, t: a.seconds * far };
    p.action = 4; p.actionT = 0; p.actionDur = (a.seconds + 0.02) * far;     // the lunge pose
    if (rank(p.sheet, 'gust')) {
      // whatever stands in the way of the step is cut as it passes
      const len = a.speed * a.seconds * far;
      for (const m of g.monsters) {
        if (m.dead) continue;
        const mx = m.x - p.x, mz = m.z - p.z, along = mx * aim.dirX + mz * aim.dirZ;
        if (along > -0.5 && along < len + 0.8 && Math.abs(mx * aim.dirZ - mz * aim.dirX) < 1.3 + m.radius) g.combat.strike(m, 1.2);
      }
    }
    p.invuln = Math.max(p.invuln, a.invuln);
    p.moveTo = null;
    g.bus.emit('dash', { x: p.x, y: p.y, z: p.z });
  },
};

export class Skills {
  constructor(game) {
    this.game = game;
    this.cooldowns = [0, 0, 0, 0];
    this.shots = [];
    this.queue = [];      // things to do a moment from now: { t, fn }
    this.cls = '';
    this.bar = [];
  }

  /** The four abilities on the hero's bar, in order: each ability's row plus its id, key and the level it opens at. */
  get list() {
    const cls = this.game.player.sheet.cls;
    if (cls !== this.cls) {
      this.cls = cls;
      this.bar = CLASSES[cls].abilities.map((id, i) => ({ ...ABILITIES[id], id, key: String(i + 1), unlock: SLOT_UNLOCK[i] }));
    }
    return this.bar;
  }

  unlocked(i) { return this.game.player.sheet.level >= SLOT_UNLOCK[i]; }

  /** Tries to use bar slot i. Aims at the target, else the cursor, else a creature close by, else straight ahead. */
  cast(i) {
    const g = this.game, p = g.player, s = this.list[i];
    if (!s || p.dead || p.dash) return false;
    if (!this.unlocked(i)) { g.bus.emit('log', { text: `${s.name} opens at level ${s.unlock}.` }); return false; }
    if (this.cooldowns[i] > 0) return false;
    const tide = s.id === 'step' && g.relics.has('tide');        // (Tidestep: the step is free, and back in half the time)
    const cost = tide ? 0 : s.focus * (p.thrift ?? 1);
    if (p.focus < cost) { g.bus.emit('log', { text: 'Not enough focus.' }); g.bus.emit('deny'); return false; }
    const aim = this.aim();
    p.focus -= cost;
    this.cooldowns[i] = s.cooldown * (s.id === 'bolt' ? 1 - 0.2 * rank(p.sheet, 'tinder') : 1) * (tide ? RELICS.tide.cooldown : 1);
    p.calm = Math.min(p.calm, 2);
    EFFECTS[s.effect](g, p, ABILITIES[s.id], aim);
    g.bus.emit('skill', { id: s.id, effect: s.effect });
    return true;
  }

  aim() {
    const g = this.game, p = g.player;
    let tx, tz;
    const t = p.target && p.target.kind === 'monster' && !p.target.dead ? p.target : null;
    if (t) { tx = t.x; tz = t.z; }
    else if (p.intent.aim) { tx = p.intent.aim.x; tz = p.intent.aim.z; }
    else {
      // no target and no cursor (keys or a touch screen): aim at the nearest creature, if one is close
      const m = g.entities.nearest('monster', p.x, p.z, 11);
      if (m) { tx = m.x; tz = m.z; }
    }
    let dx = (tx ?? p.x) - p.x, dz = (tz ?? p.z) - p.z, d = Math.hypot(dx, dz);
    if (d < 0.2) { [dx, dz] = dirFromYaw(p.yaw); d = 1; }
    return { x: tx, z: tz, dirX: dx / d, dirZ: dz / d, target: t };
  }

  /** Runs fn after `seconds` of game time. */
  later(seconds, fn) { this.queue.push({ t: seconds, fn }); }

  /** A shot made from an ability's row, flying from the hero along (dx, dz). */
  fire(p, dx, dz, a, quiet = false) {
    const g = this.game, k = scale(p, a);
    this.launch({
      x: p.x + dx * 0.6, y: p.y + 0.95, z: p.z + dz * 0.6, vx: dx * a.speed, vz: dz * a.speed, life: a.life, radius: a.radius,
      color: a.color, quiet,
      onHit: (m) => g.combat.strike(m, a.mult * k, (a.flat || 0) * k),
      splash: a.splash || 0, splashMult: (a.splashMult || 0) * k,
    });
  }

  /** Puts a shot in flight. shot: { x, y, z, vx, vz, life, radius, color, onHit(monster), splash?, splashMult?, quiet?, size? } */
  launch(shot) {
    shot.gone = false;
    this.shots.push(shot);
    this.game.bus.emit('shot:launch', shot);
  }

  update(dt) {
    const g = this.game, p = g.player;
    for (let i = 0; i < this.cooldowns.length; i++) this.cooldowns[i] = Math.max(0, this.cooldowns[i] - dt);
    p.potionCd = Math.max(0, p.potionCd - dt);
    if (p.mend) {
      p.hp = Math.min(p.maxHp, p.hp + p.mend.rate * dt);
      p.mend.left -= dt;
      if (p.mend.left <= 0) p.mend = null;
    }
    if (this.queue.length) {
      const due = [];
      this.queue = this.queue.filter((q) => ((q.t -= dt) > 0 ? true : (due.push(q), false)));
      if (!p.dead) for (const q of due) q.fn();
    }

    let w = 0;
    for (const s of this.shots) {
      s.x += s.vx * dt; s.z += s.vz * dt; s.life -= dt;
      const ground = g.world.surface(s.x, s.z);
      let hit = null, done = s.life <= 0 || ground > s.y - 0.1;
      for (const m of g.monsters) {
        if (m.dead) continue;
        if (Math.hypot(m.x - s.x, m.z - s.z) < m.radius + s.radius) { hit = m; break; }
      }
      if (!hit && !done) g.world.forEachProp(s.x, s.z, 1, (pr) => {
        if (pr.def.collide > 0 && Math.hypot(pr.x - s.x, pr.z - s.z) < pr.def.collide * pr.scale + 0.2 && s.y < pr.y + pr.def.height * pr.scale) done = true;
      });
      if (hit) {
        s.onHit(hit);
        if (s.splash) for (const m of g.monsters) {
          if (m !== hit && !m.dead && Math.hypot(m.x - s.x, m.z - s.z) < s.splash + m.radius) g.combat.strike(m, s.splashMult, 0, false);
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
