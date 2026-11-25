import { damp, dampAngle } from '../../core/math';
import type { GameContext, SimSystem } from '../../types/game-context';
import { rimAt } from '../../world/layout';
import { yawFromDir } from '../entities';
import { rand } from '../sim-rng';
import { SPECIALS, getMonsterExtras } from './monster-specials';

const LEASH = 24;
const HIT_AT = 0.5;
const out = { x: 0, z: 0 };

export class MonsterAI implements SimSystem {
  private readonly game: GameContext;

  constructor(game: GameContext) {
    this.game = game;
  }

  update(dt: number): void {
    const g = this.game;
    const p = g.player;
    const mons = g.monsters;
    for (let i = 0; i < mons.length; i++) {
      const m = mons[i];
      const ex = getMonsterExtras(m);
      m.flash = Math.max(0, m.flash - dt * 5);
      if (m.dead) {
        m.deathT += dt;
        if (m.def.fall) {
          m.action = 6;
          m.actionDur = 1e3;
          m.actionT = Math.min(1, m.deathT / m.def.fall);
          if (!m.spilled && m.deathT > m.def.fall * 0.72) {
            m.spilled = true;
            g.loot.dropFrom(m);
            g.bus.emit('boss:down', m);
          }
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

      const ai = m.ai;
      const def = m.def;
      const moves = def.specials;
      const quick = m.quick || 1;
      const speed = (m.speed || def.speed) * quick;
      const aggro = m.aggro ?? def.aggro * (m.elite ? 1.3 : 1);
      ai.cd -= dt;
      if (!ai.specCd || ai.specCd.length !== moves.length) {
        ai.specCd = moves.map((_, k) => 1 + rand() * 2.5 + k * 2);
      }
      for (let k = 0; k < ai.specCd.length; k++) ai.specCd[k] -= dt;

      if (m.boss && !m.enraged && m.hp < m.maxHp * (m.rageAt || 0.5) && ai.state !== 'special') {
        m.enraged = true;
        ex.roar = 1.5;
        ex.stun = Math.max(ex.stun, 1.5);
        g.bus.emit('boss:enrage', m);
        g.bus.emit('boss:roar', { entity: m, x: m.x, y: m.y, z: m.z });
      }
      if (ex.roar > 0) {
        ex.roar -= dt;
        m.action = 5;
        m.actionDur = 1e3;
        m.actionT = 1 - Math.max(0, ex.roar) / 1.5;
        if (ex.roar <= 0) m.action = 0;
      }

      let dx = 0;
      let dz = 0;
      const toP = Math.hypot(p.x - m.x, p.z - m.z);
      const fromHome = Math.hypot(m.x - ai.homeX, m.z - ai.homeZ);
      const fair = !p.dead && !p.safe;

      if (ex.stun > 0) {
        ex.stun -= dt;
      } else if (ai.state === 'idle') {
        ai.timer -= dt;
        if (ai.timer <= 0) {
          ai.timer = 2 + rand() * 5;
          if (rand() < 0.7) {
            const a = rand() * 6.283;
            const r = 1.5 + rand() * 5;
            ai.wanderX = ai.homeX + Math.cos(a) * r;
            ai.wanderZ = ai.homeZ + Math.sin(a) * r;
            ex.going = true;
          }
        }
        if (ex.going) {
          const d = Math.hypot(ai.wanderX - m.x, ai.wanderZ - m.z);
          if (d < 0.3) ex.going = false;
          else {
            dx = ((ai.wanderX - m.x) / d) * speed * 0.4;
            dz = ((ai.wanderZ - m.z) / d) * speed * 0.4;
          }
        }
        if (fair && ((aggro > 0 && toP < aggro) || ex.provoked)) {
          ai.state = 'chase';
          g.bus.emit('monster:alert', m);
        }
      } else if (ai.state === 'chase') {
        const reach = def.range + m.radius * 0.5;
        if (!fair || (fromHome > LEASH && !def.giant)) {
          ai.state = 'home';
          ex.provoked = false;
        } else if (def.keep && toP < def.keep[1]) {
          const away = toP < def.keep[0] ? -0.75 : 0;
          const side = (m.id % 2 ? 1 : -1) * 0.35;
          const inv = 1 / (toP || 1);
          dx = ((p.x - m.x) * away - (p.z - m.z) * side) * inv * speed;
          dz = ((p.z - m.z) * away + (p.x - m.x) * side) * inv * speed;
        } else if (toP > reach * 0.9) {
          const inv = 1 / (toP || 1);
          dx = (p.x - m.x) * inv * speed;
          dz = (p.z - m.z) * inv * speed;
        }
        const next =
          ai.state === 'chase'
            ? moves.findIndex(
                (mv, k) =>
                  ai.specCd[k] <= 0 &&
                  toP >= mv.min &&
                  toP <= mv.max &&
                  (!mv.below || m.hp < m.maxHp * mv.below),
              )
            : -1;
        if (next >= 0) {
          const chosen = moves[next];
          ai.sp = chosen;
          ai.spIdx = next;
          ai.state = 'special';
          ex.spState = SPECIALS[chosen.kind].begin(g, m, chosen);
          g.bus.emit('monster:special', m);
        } else if (toP <= reach && ai.cd <= 0 && ai.state === 'chase') {
          ai.state = 'attack';
          ai.hitDone = false;
          m.action = 1;
          m.actionT = 0;
          m.actionDur = def.attackTime;
          g.bus.emit('telegraph', {
            x: m.x,
            y: m.y,
            z: m.z,
            r: def.range + m.radius + 0.4,
            t: def.attackTime * HIT_AT,
          });
        }
        m.yaw = dampAngle(m.yaw, yawFromDir(p.x - m.x, p.z - m.z), def.turn || 9, dt);
      } else if (ai.state === 'attack') {
        if (!ai.hitDone && m.actionT >= HIT_AT) {
          ai.hitDone = true;
          g.combat.maul(m);
          g.bus.emit('monster:strike', m);
        }
        if (m.action !== 1) {
          ai.state = 'chase';
          ai.cd = (def.cooldown / quick) * (0.8 + rand() * 0.4);
        }
      } else if (ai.state === 'special') {
        const sp = ai.sp;
        if (!sp || !ex.spState) {
          ai.state = 'chase';
          ai.sp = null;
          ex.spState = null;
        } else {
          const mv = SPECIALS[sp.kind].update(g, m, sp, ex.spState, dt);
          dx = mv.dx;
          dz = mv.dz;
          if (mv.done) {
            ai.state = 'chase';
            ex.spState = null;
            ai.specCd[ai.spIdx] =
              sp.every * (m.elite ? 0.6 : 1) * (m.enraged ? 0.6 : 1) * (0.85 + rand() * 0.3);
            ai.sp = null;
            ai.cd = Math.max(ai.cd, 0.6);
          }
        }
      } else if (ai.state === 'home') {
        m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.25 * dt);
        if (fromHome < 1.2) {
          ai.state = 'idle';
          ai.timer = 1;
        } else {
          dx = ((ai.homeX - m.x) / fromHome) * speed;
          dz = ((ai.homeZ - m.z) / fromHome) * speed;
        }
      }

      if (ex.pushX || ex.pushZ) {
        dx += ex.pushX;
        dz += ex.pushZ;
        const k = Math.exp(-9 * dt);
        ex.pushX *= k;
        ex.pushZ *= k;
        if (Math.abs(ex.pushX) + Math.abs(ex.pushZ) < 0.05) {
          ex.pushX = 0;
          ex.pushZ = 0;
        }
      }

      for (let j = 0; j < mons.length; j++) {
        const o = mons[j];
        if (o === m || o.dead) continue;
        const ox = m.x - o.x;
        const oz = m.z - o.z;
        const d = Math.hypot(ox, oz);
        const min = m.radius + o.radius;
        if (d < min && d > 1e-3) {
          dx += (ox / d) * (min - d) * 4;
          dz += (oz / d) * (min - d) * 4;
        }
      }

      const pd = m.radius + p.radius;
      if (def.giant) {
        const keep = m.radius * 0.86 + p.radius;
        if (toP < keep && toP > 1e-3 && !p.dead) {
          g.world.moveCircle(
            p.x,
            p.z,
            ((p.x - m.x) / toP) * (keep - toP),
            ((p.z - m.z) / toP) * (keep - toP),
            p.radius,
            out,
          );
          p.x = out.x;
          p.z = out.z;
        }
      } else if (toP < pd && toP > 1e-3 && !p.dead) {
        dx += ((m.x - p.x) / toP) * (pd - toP) * 6;
        dz += ((m.z - p.z) / toP) * (pd - toP) * 6;
      }

      const mx = m.x;
      const mz = m.z;
      if (m.slowT > 0) {
        m.slowT -= dt;
        if (m.slowT <= 0) {
          m.slowT = 0;
          m.slow = 1;
        }
      }
      if (dx || dz) {
        if (m.slowT > 0) {
          dx *= m.slow;
          dz *= m.slow;
        }
        g.world.moveCircle(m.x, m.z, dx * dt, dz * dt, m.radius, out);
        m.x = out.x;
        m.z = out.z;
      }

      if (def.giant && m.room >= 0) {
        const room = g.world.rooms[m.room];
        if (room) {
          const rx = m.x - room.x;
          const rz = m.z - room.z;
          const rd = Math.hypot(rx, rz);
          const edge = rimAt(room, Math.atan2(rx, rz)) - m.radius * 0.9;
          if (rd > edge && rd > 1e-3) {
            m.x = room.x + (rx / rd) * edge;
            m.z = room.z + (rz / rd) * edge;
          }
        }
      }

      const moved = Math.hypot(m.x - mx, m.z - mz);
      if (
        ai.state !== 'chase' &&
        ai.state !== 'attack' &&
        ai.state !== 'special' &&
        moved > 1e-4 &&
        !ex.pushX
      ) {
        m.yaw = dampAngle(m.yaw, yawFromDir(m.x - mx, m.z - mz), 8, dt);
      }
      const before = m.walk;
      m.walk += moved * def.stride;
      if (def.giant && Math.floor(before / Math.PI) !== Math.floor(m.walk / Math.PI)) {
        g.bus.emit('boss:step', { entity: m, x: m.x, y: m.y, z: m.z });
      }
      m.move = damp(m.move, Math.min(1, moved / Math.max(dt, 1e-4) / (def.speed * 0.5)), 10, dt);
      m.y = damp(m.y, g.world.surface(m.x, m.z), 18, dt);
    }
  }
}
