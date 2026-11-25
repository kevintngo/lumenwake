// Each creature has one move of its own, and each is answered by moving, not
// by trading blows: a leap to sidestep, a charge down a lane, a cloud to leave,
// a shot to dodge, a slam to back away from, a guard to wait out.
//
// A special is data on the creature (content/creatures.js: `special: { kind, ... }`, or a list in `specials`)
// and a pair of functions here. `begin` warns on the ground (the 'telegraph'
// event: the patch that will hurt, in the beast's mustard) and returns the
// move's own state; `update` runs it and returns how the body moves this frame.
// The AI (ai.js) decides when to start one and what follows.
//
// Common fields:  every  seconds between uses      min, max  distance band to start in
//                 windup seconds of warning         mult      damage, in attacks
// Elders warn a little less and reach a little farther.

import { yawFromDir } from '../entities.js';

const reach = (m) => (m.elite ? 1.25 : 1);
const haste = (m) => (m.elite ? 0.85 : 1) / Math.sqrt(m.quick || 1);        // (a quicker creature winds up a little sooner too)
const still = { dx: 0, dz: 0, done: false };
const finished = { dx: 0, dz: 0, done: true };
/** Holds the creature's attack drawing at a chosen stage (0 start .. 0.5 the blow .. 1 over). */
const pose = (m, t) => { m.action = 1; m.actionDur = 1e3; m.actionT = t; };
const rest = (m) => { m.action = 0; };
const face = (m, x, z) => { m.yaw = yawFromDir(x - m.x, z - m.z); };
const warn = (g, x, z, r, t, extra) => g.bus.emit('telegraph', { x, y: g.world.surface(x, z), z, r, t, fill: true, ...extra });

export const SPECIALS = {
  // ---- bosses: a long call, and more of the lesser kind arrive around it
  summon: {
    begin(g, m, sp) {
      const wind = sp.windup * haste(m);
      warn(g, m.x, m.z, 2.2 * m.scale, wind);
      return { t: 0, wind };
    },
    update(g, m, sp, s, dt) {
      s.t += dt;
      pose(m, 0.3 * Math.min(1, s.t / s.wind));
      if (s.t < s.wind) return still;
      g.missions.reinforce(m, sp.adds, sp.count);
      rest(m);
      return finished;
    },
  },

  // ---- elders: a volley thrown high (stones, spores, spray) that comes down one after another on
  // wherever the hero is standing when each is thrown. Keep moving and none of it lands.
  barrage: {
    begin(g, m, sp) {
      const wind = sp.windup * haste(m);
      warn(g, m.x, m.z, m.radius + 1.2, wind);
      return { t: 0, wind, sent: 0, next: 0 };
    },
    update(g, m, sp, s, dt) {
      const p = g.player;
      s.t += dt;
      if (s.t < s.wind) { pose(m, 0.38 * (s.t / s.wind)); return still; }
      pose(m, 0.38 + 0.1 * Math.min(1, s.sent / sp.count));
      if (s.sent < sp.count) {
        s.next -= dt;
        if (s.next <= 0) {
          s.next = sp.gap; s.sent++;
          // a little ahead of where he is going, so standing still and running straight both get hit
          const lead = 0.35 * sp.drop * Math.min(1, s.sent / 2);
          g.hazards.fall(m, p.x + (p.vx || 0) * lead, p.z + (p.vz || 0) * lead, sp.r, sp.drop, sp.mult);
        }
        return still;
      }
      if ((s.rest = (s.rest || 0) + dt) < 0.7) { pose(m, 0.5 + 0.5 * s.rest / 0.7); return still; }
      rest(m);
      return finished;
    },
  },

  // ---- delver: goes under the island, and comes up where the hero was standing when it went
  burrow: {
    begin(g, m, sp) {
      const wind = sp.windup * haste(m);
      g.bus.emit('charge:dust', { x: m.x, y: m.y, z: m.z });
      return { phase: 0, t: 0, wind, r: sp.r * reach(m), tx: m.x, tz: m.z };
    },
    update(g, m, sp, s, dt) {
      const p = g.player;
      s.t += dt;
      if (s.phase === 0) {
        // down it goes (drawn sinking: action 4)
        m.action = 4; m.actionDur = 1e3; m.actionT = Math.min(1, s.t / s.wind);
        if (s.t >= s.wind) {
          s.phase = 1; s.t = 0; m.guard = true;                       // under the ground a blow barely reaches it
          s.tx = p.x; s.tz = p.z;
          warn(g, s.tx, s.tz, s.r, sp.under + 0.3);
        }
        return still;
      }
      if (s.phase === 1) {
        m.action = 4; m.actionT = 1;
        const dx = s.tx - m.x, dz = s.tz - m.z, d = Math.hypot(dx, dz);
        if ((s.dust = (s.dust || 0) - dt) <= 0) { s.dust = 0.09; g.bus.emit('charge:dust', { x: m.x, y: m.y, z: m.z }); }
        if (s.t >= sp.under) { s.phase = 2; s.t = 0; m.x = s.tx; m.z = s.tz; return still; }
        return d > 0.2 ? { dx: dx / d * sp.speed, dz: dz / d * sp.speed, done: false } : still;
      }
      if (s.phase === 2) {
        // and up
        m.action = 4; m.actionT = Math.max(0, 1 - s.t / 0.3);
        if (s.t >= 0.3) {
          s.phase = 3; s.t = 0; m.guard = false;
          g.bus.emit('slam', { x: m.x, y: m.y, z: m.z, r: s.r, heavy: true });
          if (!p.dead && Math.hypot(p.x - m.x, p.z - m.z) < s.r) g.combat.hurt(m, sp.mult, false, true);
          else if (!p.dead && Math.hypot(p.x - m.x, p.z - m.z) < s.r + 3) g.bus.emit('miss', { target: p, text: 'Dodged' });
        }
        return still;
      }
      rest(m);                                                       // out of breath, and open
      if (s.t < sp.recover) return still;
      return finished;
    },
  },

  // ---- strider: plants its feet, dips its lance, and fires down a line. Step off the line.
  lance: {
    begin(g, m, sp) {
      const p = g.player, d = Math.hypot(p.x - m.x, p.z - m.z) || 1;
      const dirx = (p.x - m.x) / d, dirz = (p.z - m.z) / d, len = sp.len * reach(m), wind = sp.windup * haste(m);
      face(m, p.x, p.z);
      g.bus.emit('telegraph', { lane: true, x: m.x + dirx * len / 2, y: m.y, z: m.z + dirz * len / 2, dirx, dirz, len, w: sp.w, t: wind });
      return { t: 0, wind, dirx, dirz, len, fired: false };
    },
    update(g, m, sp, s, dt) {
      const p = g.player;
      s.t += dt;
      if (!s.fired) {
        pose(m, 0.45 * Math.min(1, s.t / s.wind));
        if (s.t >= s.wind) {
          s.fired = true; s.t = 0;
          // whoever is still on the line is hit: how far along it, and how far off it
          const along = (p.x - m.x) * s.dirx + (p.z - m.z) * s.dirz, off = Math.abs((p.x - m.x) * s.dirz - (p.z - m.z) * s.dirx);
          g.bus.emit('lance:fire', { x: m.x, y: m.y, z: m.z, dirx: s.dirx, dirz: s.dirz, len: s.len, w: sp.w });
          if (!p.dead && along > 0 && along < s.len && off < sp.w / 2 + p.radius) g.combat.hurt(m, sp.mult);
          else if (!p.dead && along > 0 && along < s.len && off < sp.w / 2 + 2.5) g.bus.emit('miss', { target: p, text: 'Dodged' });
        }
        return still;
      }
      pose(m, 0.5 + 0.5 * Math.min(1, s.t / sp.recover));
      if (s.t < sp.recover) return still;
      rest(m);
      return finished;
    },
  },

  // ---- sparkmite: runs in, stops, swells and bursts. Killing it first stops the burst.
  fuse: {
    begin(g, m, sp) {
      const wind = sp.windup * haste(m), r = sp.r * reach(m);
      warn(g, m.x, m.z, r, wind, { entity: m });
      return { t: 0, wind, r };
    },
    update(g, m, sp, s, dt) {
      const p = g.player;
      s.t += dt;
      pose(m, Math.min(1, s.t / s.wind));
      if (s.t < s.wind) return still;
      g.bus.emit('slam', { x: m.x, y: m.y, z: m.z, r: s.r, heavy: true });
      if (!p.dead && Math.hypot(p.x - m.x, p.z - m.z) < s.r) g.combat.hurt(m, sp.mult);
      else if (!p.dead && Math.hypot(p.x - m.x, p.z - m.z) < s.r + 2.5) g.bus.emit('miss', { target: p, text: 'Dodged' });
      // it is spent: no prize for letting it go off
      m.dead = true; m.deathT = 0; m.spent = true;
      if (p.target === m) p.target = null;
      g.bus.emit('monster:died', m);
      return finished;
    },
  },

  // ---- sproutling: a hop onto where you stand
  leap: {
    begin(g, m, sp) {
      const p = g.player, r = sp.r * reach(m), wind = sp.windup * haste(m);
      face(m, p.x, p.z);
      warn(g, p.x, p.z, r, wind + sp.air);
      return { phase: 0, t: 0, wind, r, tx: p.x, tz: p.z, vx: (p.x - m.x) / sp.air, vz: (p.z - m.z) / sp.air };
    },
    update(g, m, sp, s, dt) {
      s.t += dt;
      if (s.phase === 0) {
        pose(m, 0.18 * Math.min(1, s.t / s.wind));
        if (s.t >= s.wind) { s.phase = 1; s.t = 0; }
        return still;
      }
      if (s.phase === 1) {
        const k = Math.min(1, s.t / sp.air);
        m.lift = Math.sin(k * Math.PI) * 1.5;
        pose(m, 0.3 + 0.2 * k);
        if (k < 1) return { dx: s.vx, dz: s.vz, done: false };
        m.lift = 0;
        g.bus.emit('slam', { x: m.x, y: m.y, z: m.z, r: s.r });
        if (Math.hypot(g.player.x - m.x, g.player.z - m.z) < s.r + 0.2) g.combat.hurt(m, sp.mult);
        else g.bus.emit('miss', { target: g.player, text: 'Dodged' });
        s.phase = 2; s.t = 0;
        return still;
      }
      pose(m, 0.5 + 0.5 * Math.min(1, s.t / 0.35));
      if (s.t < 0.35) return still;
      rest(m);
      return finished;
    },
  },

  // ---- bristlehog: paws the ground, then runs straight down a lane. Step aside and it is left winded.
  charge: {
    begin(g, m, sp) {
      const p = g.player, d = Math.hypot(p.x - m.x, p.z - m.z) || 1;
      const dirx = (p.x - m.x) / d, dirz = (p.z - m.z) / d, len = sp.dist * reach(m), w = m.radius * 2 + 0.7, wind = sp.windup * haste(m);
      face(m, p.x, p.z);
      g.bus.emit('telegraph', { lane: true, x: m.x + dirx * len / 2, y: m.y, z: m.z + dirz * len / 2, dirx, dirz, len, w, t: wind });
      return { phase: 0, t: 0, wind, dirx, dirz, left: len, lx: m.x, lz: m.z, stuck: 0 };
    },
    update(g, m, sp, s, dt) {
      const p = g.player;
      s.t += dt;
      if (s.phase === 0) {
        pose(m, 0.16 * Math.min(1, s.t / s.wind));          // rears back
        if (s.t >= s.wind) { s.phase = 1; s.t = 0; s.lx = m.x; s.lz = m.z; }
        return still;
      }
      if (s.phase === 1) {
        pose(m, 0.5);
        // run into something: stop there
        const went = Math.hypot(m.x - s.lx, m.z - s.lz);
        if (s.t > dt * 1.5 && went < sp.speed * dt * 0.35) s.stuck += dt; else s.stuck = 0;
        s.lx = m.x; s.lz = m.z;
        s.left -= sp.speed * dt;
        const hit = !p.dead && Math.hypot(p.x - m.x, p.z - m.z) < m.radius + p.radius + 0.3;
        if (hit) { g.combat.hurt(m, sp.mult); s.phase = 2; s.t = 0; return still; }
        if (s.left <= 0 || s.stuck > 0.08) {
          // missed: out of breath, and open
          g.bus.emit('miss', { target: m, text: 'Winded' });
          m.ai.stun = sp.winded;
          rest(m);
          return finished;
        }
        if ((s.dust = (s.dust || 0) - dt) <= 0) { s.dust = 0.07; g.bus.emit('charge:dust', { x: m.x, y: m.y, z: m.z }); }
        return { dx: s.dirx * sp.speed, dz: s.dirz * sp.speed, done: false };
      }
      pose(m, 0.5 + 0.5 * Math.min(1, s.t / 0.4));
      if (s.t < 0.4) return still;
      rest(m);
      return finished;
    },
  },

  // ---- puffcap: swells and lets go a cloud of spores that hangs where it stood
  cloud: {
    begin(g, m, sp) {
      const r = sp.r * reach(m), wind = sp.windup * haste(m);
      warn(g, m.x, m.z, r, wind);
      return { t: 0, wind, r, out: false };
    },
    update(g, m, sp, s, dt) {
      s.t += dt;
      if (!s.out) {
        pose(m, 0.45 * Math.min(1, s.t / s.wind));
        if (s.t >= s.wind) { s.out = true; s.t = 0; g.hazards.cloud(m, s.r, sp.life, sp.mult, sp.tick); }
        return still;
      }
      pose(m, 0.5 + 0.5 * Math.min(1, s.t / 0.4));
      if (s.t < 0.4) return still;
      rest(m);
      return finished;
    },
  },

  // ---- glimmerwisp: gathers a mote of light and sends it where you are standing
  shot: {
    begin(g, m, sp) {
      const wind = sp.windup * haste(m);
      face(m, g.player.x, g.player.z);
      g.bus.emit('telegraph', { x: m.x, y: m.y + 0.05, z: m.z, r: 0.9, t: wind });
      return { t: 0, wind, fired: false };
    },
    update(g, m, sp, s, dt) {
      const p = g.player;
      s.t += dt;
      if (!s.fired) {
        face(m, p.x, p.z);
        pose(m, 0.4 * Math.min(1, s.t / s.wind));
        if (s.t >= s.wind) {
          s.fired = true; s.t = 0;
          const d = Math.hypot(p.x - m.x, p.z - m.z) || 1;
          g.hazards.shot(m, (p.x - m.x) / d, (p.z - m.z) / d, sp);
        }
        return still;
      }
      pose(m, 0.5 + 0.5 * Math.min(1, s.t / 0.3));
      if (s.t < 0.3) return still;
      rest(m);
      return finished;
    },
  },

  // ---- cragling: both fists up, a long moment, then the ground jumps
  slam: {
    begin(g, m, sp) {
      const r = sp.r * reach(m), wind = sp.windup * haste(m);
      warn(g, m.x, m.z, r, wind);
      return { t: 0, wind, r, down: false };
    },
    update(g, m, sp, s, dt) {
      const p = g.player;
      s.t += dt;
      if (!s.down) {
        pose(m, 0.4 * Math.min(1, s.t / s.wind));
        if (s.t >= s.wind) {
          s.down = true; s.t = 0;
          g.bus.emit('slam', { x: m.x, y: m.y, z: m.z, r: s.r, heavy: true });
          if (!p.dead && Math.hypot(p.x - m.x, p.z - m.z) < s.r) g.combat.hurt(m, sp.mult, false, true);
          else if (!p.dead && Math.hypot(p.x - m.x, p.z - m.z) < s.r + 3) g.bus.emit('miss', { target: p, text: 'Dodged' });
        }
        return still;
      }
      pose(m, Math.min(1, 0.45 + 0.55 * s.t / sp.recover));        // fists stay down a while: the moment to hit back
      if (s.t < sp.recover) return still;
      rest(m);
      return finished;
    },
  },

  // ---- shellsnap: tucks in (blows glance off), then snaps wide as it comes out
  guard: {
    begin(g, m, sp) {
      m.guard = true;
      g.bus.emit('miss', { target: m, text: 'Guarding' });
      g.bus.emit('guard', { entity: m, t: sp.hold });
      return { t: 0, warned: false, r: sp.r * reach(m), snapped: false };
    },
    update(g, m, sp, s, dt) {
      const p = g.player;
      s.t += dt;
      if (!s.snapped) {
        m.action = 3; m.actionDur = 1e3; m.actionT = 0.2;           // held low in its shell
        if (!s.warned && s.t >= sp.hold - sp.windup) { s.warned = true; warn(g, m.x, m.z, s.r, sp.windup); }
        if (s.t >= sp.hold) {
          s.snapped = true; s.t = 0; m.guard = false;
          g.bus.emit('slam', { x: m.x, y: m.y, z: m.z, r: s.r });
          if (!p.dead && Math.hypot(p.x - m.x, p.z - m.z) < s.r) g.combat.hurt(m, sp.mult, false, true);
        }
        return still;
      }
      pose(m, 0.5 + 0.5 * Math.min(1, s.t / 0.45));
      if (s.t < 0.45) return still;
      rest(m);
      return finished;
    },
  },
};
