import { getPlayerVelocity } from '../character/player-system';
import { yawFromDir } from '../entities';
import type { MonsterEntity, MonsterSpecialDef } from '../../types/entity';
import type { GameContext } from '../../types/game-context';

interface SpecialMoveResult {
  dx: number;
  dz: number;
  done: boolean;
}

interface SpecialState {
  t: number;
  wind?: number;
  sent?: number;
  next?: number;
  rest?: number;
  phase?: number;
  r?: number;
  tx?: number;
  tz?: number;
  dust?: number;
  dirx?: number;
  dirz?: number;
  len?: number;
  fired?: boolean;
  vx?: number;
  vz?: number;
  left?: number;
  lx?: number;
  lz?: number;
  stuck?: number;
  out?: boolean;
  down?: boolean;
  warned?: boolean;
  snapped?: boolean;
}

interface MonsterRuntimeExtras {
  pushX: number;
  pushZ: number;
  provoked: boolean;
  stun: number;
  roar: number;
  going: boolean;
  spState: SpecialState | null;
}

const extrasMap = new WeakMap<MonsterEntity, MonsterRuntimeExtras>();

export function getMonsterExtras(m: MonsterEntity): MonsterRuntimeExtras {
  let ex = extrasMap.get(m);
  if (!ex) {
    ex = { pushX: 0, pushZ: 0, provoked: false, stun: 0, roar: 0, going: false, spState: null };
    extrasMap.set(m, ex);
  }
  return ex;
}

export function applyKnockback(m: MonsterEntity, px: number, pz: number): void {
  const ex = getMonsterExtras(m);
  ex.pushX = px;
  ex.pushZ = pz;
}

export function provokeMonster(m: MonsterEntity): void {
  getMonsterExtras(m).provoked = true;
}

function stunMonster(m: MonsterEntity, seconds: number): void {
  const ex = getMonsterExtras(m);
  ex.stun = Math.max(ex.stun, seconds);
}

interface SpecialHandler {
  begin(g: GameContext, m: MonsterEntity, sp: MonsterSpecialDef): SpecialState;
  update(g: GameContext, m: MonsterEntity, sp: MonsterSpecialDef, s: SpecialState, dt: number): SpecialMoveResult;
}

const reach = (m: MonsterEntity): number => (m.elite ? 1.25 : 1);
const haste = (m: MonsterEntity): number => (m.elite ? 0.85 : 1) / Math.sqrt(m.quick || 1);
const still: SpecialMoveResult = { dx: 0, dz: 0, done: false };
const finished: SpecialMoveResult = { dx: 0, dz: 0, done: true };
const pose = (m: MonsterEntity, t: number): void => {
  m.action = 1;
  m.actionDur = 1e3;
  m.actionT = t;
};
const rest = (m: MonsterEntity): void => {
  m.action = 0;
};
const face = (m: MonsterEntity, x: number, z: number): void => {
  m.yaw = yawFromDir(x - m.x, z - m.z);
};
const warn = (g: GameContext, x: number, z: number, r: number, t: number): void => {
  g.bus.emit('telegraph', { x, y: g.world.surface(x, z), z, r, t, fill: true });
};

export const SPECIALS: Readonly<Record<MonsterSpecialDef['kind'], SpecialHandler>> = {
  summon: {
    begin(g, m, sp) {
      const wind = sp.windup * haste(m);
      warn(g, m.x, m.z, 2.2 * m.scale, wind);
      return { t: 0, wind };
    },
    update(g, m, sp, s, dt) {
      const wind = s.wind ?? sp.windup;
      s.t += dt;
      pose(m, 0.3 * Math.min(1, s.t / wind));
      if (s.t < wind) return still;
      if (sp.adds) g.missions.reinforce(m, sp.adds, sp.count ?? 2);
      rest(m);
      return finished;
    },
  },

  barrage: {
    begin(g, m, sp) {
      const wind = sp.windup * haste(m);
      warn(g, m.x, m.z, m.radius + 1.2, wind);
      return { t: 0, wind, sent: 0, next: 0 };
    },
    update(g, m, sp, s, dt) {
      const p = g.player;
      const wind = s.wind ?? sp.windup;
      const count = sp.count ?? 5;
      const drop = sp.drop ?? 1.2;
      const gap = sp.gap ?? 0.4;
      const r = sp.r ?? 2.5;
      const mult = sp.mult ?? 1.1;
      s.t += dt;
      if (s.t < wind) {
        pose(m, 0.38 * (s.t / wind));
        return still;
      }
      const sent = s.sent ?? 0;
      pose(m, 0.38 + 0.1 * Math.min(1, sent / count));
      if (sent < count) {
        s.next = (s.next ?? 0) - dt;
        if (s.next <= 0) {
          s.next = gap;
          s.sent = sent + 1;
          const vel = getPlayerVelocity(p);
          const lead = 0.35 * drop * Math.min(1, s.sent / 2);
          g.hazards.fall(m, p.x + vel.vx * lead, p.z + vel.vz * lead, r, drop, mult);
        }
        return still;
      }
      s.rest = (s.rest ?? 0) + dt;
      if (s.rest < 0.7) {
        pose(m, 0.5 + (0.5 * s.rest) / 0.7);
        return still;
      }
      rest(m);
      return finished;
    },
  },

  burrow: {
    begin(g, m, sp) {
      const wind = sp.windup * haste(m);
      g.bus.emit('charge:dust', { x: m.x, y: m.y, z: m.z });
      return { phase: 0, t: 0, wind, r: (sp.r ?? 2.4) * reach(m), tx: m.x, tz: m.z };
    },
    update(g, m, sp, s, dt) {
      const p = g.player;
      const wind = s.wind ?? sp.windup;
      const under = sp.under ?? 0.95;
      const r = s.r ?? 2.4;
      const speed = sp.speed ?? 10;
      const mult = sp.mult ?? 1.6;
      const recover = sp.recover ?? 0.9;
      s.t += dt;
      if (s.phase === 0) {
        m.action = 4;
        m.actionDur = 1e3;
        m.actionT = Math.min(1, s.t / wind);
        if (s.t >= wind) {
          s.phase = 1;
          s.t = 0;
          m.guard = true;
          s.tx = p.x;
          s.tz = p.z;
          warn(g, s.tx, s.tz, r, under + 0.3);
        }
        return still;
      }
      if (s.phase === 1) {
        m.action = 4;
        m.actionT = 1;
        const tx = s.tx ?? m.x;
        const tz = s.tz ?? m.z;
        const dx = tx - m.x;
        const dz = tz - m.z;
        const d = Math.hypot(dx, dz);
        s.dust = (s.dust ?? 0) - dt;
        if (s.dust <= 0) {
          s.dust = 0.09;
          g.bus.emit('charge:dust', { x: m.x, y: m.y, z: m.z });
        }
        if (s.t >= under) {
          s.phase = 2;
          s.t = 0;
          m.x = tx;
          m.z = tz;
          return still;
        }
        return d > 0.2 ? { dx: (dx / d) * speed, dz: (dz / d) * speed, done: false } : still;
      }
      if (s.phase === 2) {
        m.action = 4;
        m.actionT = Math.max(0, 1 - s.t / 0.3);
        if (s.t >= 0.3) {
          s.phase = 3;
          s.t = 0;
          m.guard = false;
          g.bus.emit('slam', { x: m.x, y: m.y, z: m.z, r, heavy: true });
          const dist = Math.hypot(p.x - m.x, p.z - m.z);
          if (!p.dead && dist < r) g.combat.hurt(m, mult, false, true);
          else if (!p.dead && dist < r + 3) g.bus.emit('miss', { target: p, text: 'Dodged' });
        }
        return still;
      }
      rest(m);
      if (s.t < recover) return still;
      return finished;
    },
  },

  lance: {
    begin(g, m, sp) {
      const p = g.player;
      const d = Math.hypot(p.x - m.x, p.z - m.z) || 1;
      const dirx = (p.x - m.x) / d;
      const dirz = (p.z - m.z) / d;
      const len = (sp.len ?? 16) * reach(m);
      const w = sp.w ?? 1.5;
      const wind = sp.windup * haste(m);
      face(m, p.x, p.z);
      g.bus.emit('telegraph', {
        lane: true,
        x: m.x + (dirx * len) / 2,
        y: m.y,
        z: m.z + (dirz * len) / 2,
        dirx,
        dirz,
        len,
        w,
        t: wind,
      });
      return { t: 0, wind, dirx, dirz, len, fired: false };
    },
    update(g, m, sp, s, dt) {
      const p = g.player;
      const wind = s.wind ?? sp.windup;
      const dirx = s.dirx ?? 0;
      const dirz = s.dirz ?? 1;
      const len = s.len ?? sp.len ?? 16;
      const w = sp.w ?? 1.5;
      const mult = sp.mult ?? 1.9;
      const recover = sp.recover ?? 0.7;
      s.t += dt;
      if (!s.fired) {
        pose(m, 0.45 * Math.min(1, s.t / wind));
        if (s.t >= wind) {
          s.fired = true;
          s.t = 0;
          const along = (p.x - m.x) * dirx + (p.z - m.z) * dirz;
          const off = Math.abs((p.x - m.x) * dirz - (p.z - m.z) * dirx);
          g.bus.emit('lance:fire', { x: m.x, y: m.y, z: m.z, dirx, dirz, len, w });
          if (!p.dead && along > 0 && along < len && off < w / 2 + p.radius) {
            g.combat.hurt(m, mult);
          } else if (!p.dead && along > 0 && along < len && off < w / 2 + 2.5) {
            g.bus.emit('miss', { target: p, text: 'Dodged' });
          }
        }
        return still;
      }
      pose(m, 0.5 + 0.5 * Math.min(1, s.t / recover));
      if (s.t < recover) return still;
      rest(m);
      return finished;
    },
  },

  fuse: {
    begin(g, m, sp) {
      const wind = sp.windup * haste(m);
      const r = (sp.r ?? 2.5) * reach(m);
      warn(g, m.x, m.z, r, wind);
      return { t: 0, wind, r };
    },
    update(g, m, sp, s, dt) {
      const p = g.player;
      const wind = s.wind ?? sp.windup;
      const r = s.r ?? 2.5;
      const mult = sp.mult ?? 1.7;
      s.t += dt;
      pose(m, Math.min(1, s.t / wind));
      if (s.t < wind) return still;
      g.bus.emit('slam', { x: m.x, y: m.y, z: m.z, r, heavy: true });
      const dist = Math.hypot(p.x - m.x, p.z - m.z);
      if (!p.dead && dist < r) g.combat.hurt(m, mult);
      else if (!p.dead && dist < r + 2.5) g.bus.emit('miss', { target: p, text: 'Dodged' });
      m.dead = true;
      m.deathT = 0;
      if (p.target === m) p.target = null;
      g.bus.emit('monster:died', m);
      return finished;
    },
  },

  leap: {
    begin(g, m, sp) {
      const p = g.player;
      const r = (sp.r ?? 1.3) * reach(m);
      const wind = sp.windup * haste(m);
      const air = sp.air ?? 0.42;
      face(m, p.x, p.z);
      warn(g, p.x, p.z, r, wind + air);
      return {
        phase: 0,
        t: 0,
        wind,
        r,
        tx: p.x,
        tz: p.z,
        vx: (p.x - m.x) / air,
        vz: (p.z - m.z) / air,
      };
    },
    update(g, m, sp, s, dt) {
      const wind = s.wind ?? sp.windup;
      const air = sp.air ?? 0.42;
      const r = s.r ?? 1.3;
      const mult = sp.mult ?? 1.3;
      s.t += dt;
      if (s.phase === 0) {
        pose(m, 0.18 * Math.min(1, s.t / wind));
        if (s.t >= wind) {
          s.phase = 1;
          s.t = 0;
        }
        return still;
      }
      if (s.phase === 1) {
        const k = Math.min(1, s.t / air);
        m.lift = Math.sin(k * Math.PI) * 1.5;
        pose(m, 0.3 + 0.2 * k);
        if (k < 1) return { dx: s.vx ?? 0, dz: s.vz ?? 0, done: false };
        m.lift = 0;
        g.bus.emit('slam', { x: m.x, y: m.y, z: m.z, r });
        if (Math.hypot(g.player.x - m.x, g.player.z - m.z) < r + 0.2) g.combat.hurt(m, mult);
        else g.bus.emit('miss', { target: g.player, text: 'Dodged' });
        s.phase = 2;
        s.t = 0;
        return still;
      }
      pose(m, 0.5 + 0.5 * Math.min(1, s.t / 0.35));
      if (s.t < 0.35) return still;
      rest(m);
      return finished;
    },
  },

  charge: {
    begin(g, m, sp) {
      const p = g.player;
      const d = Math.hypot(p.x - m.x, p.z - m.z) || 1;
      const dirx = (p.x - m.x) / d;
      const dirz = (p.z - m.z) / d;
      const len = (sp.dist ?? 11) * reach(m);
      const w = m.radius * 2 + 0.7;
      const wind = sp.windup * haste(m);
      face(m, p.x, p.z);
      g.bus.emit('telegraph', {
        lane: true,
        x: m.x + (dirx * len) / 2,
        y: m.y,
        z: m.z + (dirz * len) / 2,
        dirx,
        dirz,
        len,
        w,
        t: wind,
      });
      return { phase: 0, t: 0, wind, dirx, dirz, left: len, lx: m.x, lz: m.z, stuck: 0 };
    },
    update(g, m, sp, s, dt) {
      const p = g.player;
      const wind = s.wind ?? sp.windup;
      const speed = sp.speed ?? 13;
      const dirx = s.dirx ?? 0;
      const dirz = s.dirz ?? 1;
      const mult = sp.mult ?? 1.9;
      const winded = sp.winded ?? 1.4;
      s.t += dt;
      if (s.phase === 0) {
        pose(m, 0.16 * Math.min(1, s.t / wind));
        if (s.t >= wind) {
          s.phase = 1;
          s.t = 0;
          s.lx = m.x;
          s.lz = m.z;
        }
        return still;
      }
      if (s.phase === 1) {
        pose(m, 0.5);
        const went = Math.hypot(m.x - (s.lx ?? m.x), m.z - (s.lz ?? m.z));
        if (s.t > dt * 1.5 && went < speed * dt * 0.35) s.stuck = (s.stuck ?? 0) + dt;
        else s.stuck = 0;
        s.lx = m.x;
        s.lz = m.z;
        s.left = (s.left ?? 0) - speed * dt;
        const hit = !p.dead && Math.hypot(p.x - m.x, p.z - m.z) < m.radius + p.radius + 0.3;
        if (hit) {
          g.combat.hurt(m, mult);
          s.phase = 2;
          s.t = 0;
          return still;
        }
        if (s.left <= 0 || s.stuck > 0.08) {
          g.bus.emit('miss', { target: m, text: 'Winded' });
          stunMonster(m, winded);
          rest(m);
          return finished;
        }
        s.dust = (s.dust ?? 0) - dt;
        if (s.dust <= 0) {
          s.dust = 0.07;
          g.bus.emit('charge:dust', { x: m.x, y: m.y, z: m.z });
        }
        return { dx: dirx * speed, dz: dirz * speed, done: false };
      }
      pose(m, 0.5 + 0.5 * Math.min(1, s.t / 0.4));
      if (s.t < 0.4) return still;
      rest(m);
      return finished;
    },
  },

  cloud: {
    begin(g, m, sp) {
      const r = (sp.r ?? 2.5) * reach(m);
      const wind = sp.windup * haste(m);
      warn(g, m.x, m.z, r, wind);
      return { t: 0, wind, r, out: false };
    },
    update(g, m, sp, s, dt) {
      const wind = s.wind ?? sp.windup;
      const r = s.r ?? 2.5;
      s.t += dt;
      if (!s.out) {
        pose(m, 0.45 * Math.min(1, s.t / wind));
        if (s.t >= wind) {
          s.out = true;
          s.t = 0;
          g.hazards.cloud(m, r, sp.life ?? 4.2, sp.mult ?? 0.45, sp.tick ?? 0.55);
        }
        return still;
      }
      pose(m, 0.5 + 0.5 * Math.min(1, s.t / 0.4));
      if (s.t < 0.4) return still;
      rest(m);
      return finished;
    },
  },

  shot: {
    begin(g, m, sp) {
      const wind = sp.windup * haste(m);
      face(m, g.player.x, g.player.z);
      g.bus.emit('telegraph', { x: m.x, y: m.y + 0.05, z: m.z, r: 0.9, t: wind });
      return { t: 0, wind, fired: false };
    },
    update(g, m, sp, s, dt) {
      const p = g.player;
      const wind = s.wind ?? sp.windup;
      s.t += dt;
      if (!s.fired) {
        face(m, p.x, p.z);
        pose(m, 0.4 * Math.min(1, s.t / wind));
        if (s.t >= wind) {
          s.fired = true;
          s.t = 0;
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

  slam: {
    begin(g, m, sp) {
      const r = (sp.r ?? 3.3) * reach(m);
      const wind = sp.windup * haste(m);
      warn(g, m.x, m.z, r, wind);
      return { t: 0, wind, r, down: false };
    },
    update(g, m, sp, s, dt) {
      const p = g.player;
      const wind = s.wind ?? sp.windup;
      const r = s.r ?? 3.3;
      const mult = sp.mult ?? 1.7;
      const recover = sp.recover ?? 1.0;
      s.t += dt;
      if (!s.down) {
        pose(m, 0.4 * Math.min(1, s.t / wind));
        if (s.t >= wind) {
          s.down = true;
          s.t = 0;
          g.bus.emit('slam', { x: m.x, y: m.y, z: m.z, r, heavy: true });
          const dist = Math.hypot(p.x - m.x, p.z - m.z);
          if (!p.dead && dist < r) g.combat.hurt(m, mult, false, true);
          else if (!p.dead && dist < r + 3) g.bus.emit('miss', { target: p, text: 'Dodged' });
        }
        return still;
      }
      pose(m, Math.min(1, 0.45 + (0.55 * s.t) / recover));
      if (s.t < recover) return still;
      rest(m);
      return finished;
    },
  },

  guard: {
    begin(g, m, sp) {
      const hold = sp.hold ?? 1.5;
      m.guard = true;
      g.bus.emit('miss', { target: m, text: 'Guarding' });
      g.bus.emit('guard', { entity: m, t: hold });
      return { t: 0, warned: false, r: (sp.r ?? 2.3) * reach(m), snapped: false };
    },
    update(g, m, sp, s, dt) {
      const p = g.player;
      const hold = sp.hold ?? 1.5;
      const r = s.r ?? 2.3;
      const mult = sp.mult ?? 1.4;
      s.t += dt;
      if (!s.snapped) {
        m.action = 3;
        m.actionDur = 1e3;
        m.actionT = 0.2;
        if (!s.warned && s.t >= hold - sp.windup) {
          s.warned = true;
          warn(g, m.x, m.z, r, sp.windup);
        }
        if (s.t >= hold) {
          s.snapped = true;
          s.t = 0;
          m.guard = false;
          g.bus.emit('slam', { x: m.x, y: m.y, z: m.z, r });
          if (!p.dead && Math.hypot(p.x - m.x, p.z - m.z) < r) g.combat.hurt(m, mult, false, true);
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
