// Monster behaviour: a small state machine per monster.
//   idle   wander near home; notice the player if this kind is aggressive
//   chase  close in; give up at the end of the leash
//   attack wind up, strike at a fixed point in the animation, recover
//   home   walk back and mend
//   special the creature's own move (specials.js): warned on the ground, answered by moving
// A new behaviour (fleeing, pack tactics) is a new state here; a new move is an entry in specials.js.

import { damp, dampAngle } from '../../core/math.js';
import { yawFromDir } from '../entities.js';
import { SPECIALS } from './specials.js';
import { rand } from '../rng.js';
import { rimAt } from '../../world/layout.js';

const LEASH = 24, HIT_AT = 0.5;
const out = { x: 0, z: 0 };

const NONE = [];

export class MonsterAI {
  constructor(game) {
    this.game = game;
  }

  update(dt) {
    const g = this.game, p = g.player;
    const mons = g.monsters;
    for (let i = 0; i < mons.length; i++) {
      const m = mons[i];
      m.flash = Math.max(0, m.flash - dt * 5);
      if (m.dead) {
        m.deathT += dt;
        if (m.def.fall) {
          // an elder takes its time coming down; what it carried spills out as it hits the ground
          m.action = 6; m.actionDur = 1e3; m.actionT = Math.min(1, m.deathT / m.def.fall);
          if (!m.spilt && m.deathT > m.def.fall * 0.72) { m.spilt = true; g.loot.dropFrom(m); g.bus.emit('boss:down', m); }
          if (m.deathT >= m.def.fall) m.gone = true;
          continue;
        }
        m.grow = Math.max(0, 1 - m.deathT * 3.2);
        if (m.deathT > 0.4) m.gone = true;
        continue;
      }
      m.grow = Math.min(1, m.grow + dt * 3);
      if (m.action) {
        m.actionT += dt / m.actionDur;
        if (m.actionT >= 1) m.action = 0;
      }
      const ai = m.ai, def = m.def, moves = def.specials || (def.special ? (def.specials = [def.special]) : NONE);
      const quick = m.quick || 1, speed = def.speed * quick;        // (a place's threat may make its creatures quicker: content/threat.js)
      ai.cd -= dt;
      // each move has its own clock, and none is the opening move
      if (!ai.scds) ai.scds = moves.map((_, k) => 1 + rand() * 2.5 + k * 2);
      for (let k = 0; k < ai.scds.length; k++) ai.scds[k] -= dt;
      let sp = ai.move || null;
      if (m.boss && !m.enraged && m.hp < m.maxHp * (m.rageAt || 0.5) && ai.state !== 'special') {
        // wounded: it stops, gives voice, and from here on its moves come faster
        m.enraged = true; ai.roar = 1.5; ai.stun = Math.max(ai.stun || 0, 1.5);
        g.bus.emit('boss:enrage', m);
        g.bus.emit('boss:roar', { entity: m, x: m.x, y: m.y, z: m.z });
      }
      if (ai.roar > 0) {
        ai.roar -= dt;
        m.action = 5; m.actionDur = 1e3; m.actionT = 1 - Math.max(0, ai.roar) / 1.5;
        if (ai.roar <= 0) m.action = 0;
      }
      let dx = 0, dz = 0;
      const toP = Math.hypot(p.x - m.x, p.z - m.z);
      const fromHome = Math.hypot(m.x - ai.hx, m.z - ai.hz);
      const fair = !p.dead && !p.safe;

      if (ai.stun > 0) {
        // winded after a missed charge: stands there, open
        ai.stun -= dt;
      } else if (ai.state === 'idle') {
        ai.timer -= dt;
        if (ai.timer <= 0) {
          ai.timer = 2 + rand() * 5;
          if (rand() < 0.7) {
            const a = rand() * 6.283, r = 1.5 + rand() * 5;
            ai.gx = ai.hx + Math.cos(a) * r; ai.gz = ai.hz + Math.sin(a) * r; ai.going = true;
          }
        }
        if (ai.going) {
          const d = Math.hypot(ai.gx - m.x, ai.gz - m.z);
          if (d < 0.3) ai.going = false;
          else { dx = (ai.gx - m.x) / d * speed * 0.4; dz = (ai.gz - m.z) / d * speed * 0.4; }
        }
        if (fair && ((def.aggro > 0 && toP < def.aggro * (m.elite ? 1.3 : 1) * (m.aggroMul || 1)) || ai.provoked)) { ai.state = 'chase'; ai.target = p; g.bus.emit('monster:alert', m); }
      } else if (ai.state === 'chase') {
        const reach = def.range + m.radius * 0.5;
        if (!fair || (fromHome > LEASH && !def.giant)) { ai.state = 'home'; ai.provoked = false; }
        else if (def.keep && toP < def.keep[1]) {
          // a shooter keeps its distance: backs off when crowded, drifts sideways otherwise
          const away = toP < def.keep[0] ? -0.75 : 0, side = (m.id % 2 ? 1 : -1) * 0.35;
          dx = ((p.x - m.x) * away - (p.z - m.z) * side) / toP * speed;
          dz = ((p.z - m.z) * away + (p.x - m.x) * side) / toP * speed;
        }
        else if (toP > reach * 0.9) { dx = (p.x - m.x) / toP * speed; dz = (p.z - m.z) / toP * speed; }
        const next = ai.state === 'chase' ? moves.findIndex((mv, k) => ai.scds[k] <= 0 && toP >= mv.min && toP <= mv.max && (!mv.below || m.hp < m.maxHp * mv.below)) : -1;
        if (next >= 0) {
          sp = ai.move = moves[next]; ai.moveIndex = next;
          ai.state = 'special';
          ai.sp = SPECIALS[sp.kind].begin(g, m, sp);
          g.bus.emit('monster:special', m);
        } else
        if (toP <= reach && ai.cd <= 0 && ai.state === 'chase') {
          ai.state = 'attack'; ai.struck = false;
          m.action = 1; m.actionT = 0; m.actionDur = def.attackTime;
          g.bus.emit('telegraph', { x: m.x, y: m.y, z: m.z, r: def.range + m.radius + 0.4, t: def.attackTime * HIT_AT });
        }
        m.yaw = dampAngle(m.yaw, yawFromDir(p.x - m.x, p.z - m.z), def.turn || 9, dt);
      } else if (ai.state === 'attack') {
        if (!ai.struck && m.actionT >= HIT_AT) { ai.struck = true; g.combat.maul(m); g.bus.emit('monster:strike', m); }
        if (m.action !== 1) { ai.state = 'chase'; ai.cd = def.cooldown / quick * (0.8 + rand() * 0.4); }
      } else if (ai.state === 'special') {
        const mv = SPECIALS[sp.kind].update(g, m, sp, ai.sp, dt);
        dx = mv.dx; dz = mv.dz;
        if (mv.done) {
          ai.state = 'chase'; ai.sp = null;
          ai.scds[ai.moveIndex] = sp.every * (m.elite ? 0.6 : 1) * (m.enraged ? 0.6 : 1) * (0.85 + rand() * 0.3);
          ai.move = null;
          ai.cd = Math.max(ai.cd, 0.6);
        }
      } else if (ai.state === 'home') {
        m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.25 * dt);
        if (fromHome < 1.2) { ai.state = 'idle'; ai.timer = 1; }
        else { dx = (ai.hx - m.x) / fromHome * speed; dz = (ai.hz - m.z) / fromHome * speed; }
      }

      // knockback decays quickly
      if (ai.pushX || ai.pushZ) {
        dx += ai.pushX; dz += ai.pushZ;
        const k = Math.exp(-9 * dt);
        ai.pushX *= k; ai.pushZ *= k;
        if (Math.abs(ai.pushX) + Math.abs(ai.pushZ) < 0.05) ai.pushX = ai.pushZ = 0;
      }
      // keep a little personal space from other monsters and from the player
      for (let j = 0; j < mons.length; j++) {
        const o = mons[j];
        if (o === m || o.dead) continue;
        const ox = m.x - o.x, oz = m.z - o.z, d = Math.hypot(ox, oz), min = m.radius + o.radius;
        if (d < min && d > 1e-3) { dx += ox / d * (min - d) * 4; dz += oz / d * (min - d) * 4; }
      }
      const pd = m.radius + p.radius;
      if (def.giant) {
        // a colossus does not step aside for the hero: the hero is moved off the ground it stands on
        const keep = m.radius * 0.86 + p.radius;
        if (toP < keep && toP > 1e-3 && !p.dead) {
          g.world.moveCircle(p.x, p.z, (p.x - m.x) / toP * (keep - toP), (p.z - m.z) / toP * (keep - toP), p.radius, out);
          p.x = out.x; p.z = out.z;
        }
      } else if (toP < pd && toP > 1e-3 && !p.dead) { dx += (m.x - p.x) / toP * (pd - toP) * 6; dz += (m.z - p.z) / toP * (pd - toP) * 6; }

      const mx = m.x, mz = m.z;
      if (dx || dz) {
        if (m.slow) { if ((m.slow.t -= dt) > 0) { dx *= m.slow.k; dz *= m.slow.k; } else m.slow = null; }
        g.world.moveCircle(m.x, m.z, dx * dt, dz * dt, m.radius, out);        // (on foot: a terrace's side stops it)
        m.x = out.x; m.z = out.z;
      }
      if (def.giant && m.room !== undefined) {
        // it is too big for the bridges: it keeps to its own island
        const room = g.world.rooms[m.room], rx = m.x - room.x, rz = m.z - room.z, rd = Math.hypot(rx, rz);
        const edge = rimAt(room, Math.atan2(rx, rz)) - m.radius * 0.9;
        if (rd > edge && rd > 1e-3) { m.x = room.x + rx / rd * edge; m.z = room.z + rz / rd * edge; }
      }
      const moved = Math.hypot(m.x - mx, m.z - mz);
      if (ai.state !== 'chase' && ai.state !== 'attack' && ai.state !== 'special' && moved > 1e-4 && !ai.pushX) m.yaw = dampAngle(m.yaw, yawFromDir(m.x - mx, m.z - mz), 8, dt);
      const before = m.walk;
      m.walk += moved * def.stride;
      if (def.giant && Math.floor(before / Math.PI) !== Math.floor(m.walk / Math.PI)) g.bus.emit('boss:step', { entity: m, x: m.x, y: m.y, z: m.z });
      m.move = damp(m.move, Math.min(1, moved / Math.max(dt, 1e-4) / (def.speed * 0.5)), 10, dt);
      m.y = damp(m.y, g.world.surface(m.x, m.z), 18, dt);
    }
  }
}
