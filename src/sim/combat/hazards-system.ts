import type { RgbTuple } from '../../types/domain';
import type { MonsterEntity, MonsterSpecialDef } from '../../types/entity';
import type { GameContext, HazardsLike } from '../../types/game-context';

interface CloudHazard {
  kind: 'cloud';
  src: MonsterEntity;
  x: number;
  z: number;
  r: number;
  left: number;
  mult: number;
  tick: number;
  next: number;
}

interface ShotHazard {
  kind: 'shot';
  src: MonsterEntity;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  r: number;
  left: number;
  mult: number;
  color: RgbTuple;
  size: number;
  gone: boolean;
}

interface FallHazard {
  kind: 'fall';
  src: MonsterEntity;
  x: number;
  y: number;
  z: number;
  ground: number;
  r: number;
  left: number;
  drop: number;
  mult: number;
  color: RgbTuple;
  size: number;
  gone: boolean;
}

type HazardEntry = CloudHazard | ShotHazard | FallHazard;

export class Hazards implements HazardsLike {
  private readonly game: GameContext;
  private readonly list: HazardEntry[] = [];

  constructor(game: GameContext) {
    this.game = game;
  }

  cloud(m: MonsterEntity, r: number, life: number, mult: number, tick: number): void {
    const g = this.game;
    const y = g.world.surface(m.x, m.z);
    g.bus.emit('hazard:cloud', { x: m.x, y, z: m.z, r, life });
    this.list.push({
      kind: 'cloud',
      src: m,
      x: m.x,
      z: m.z,
      r,
      left: life,
      mult,
      tick,
      next: tick * 0.5,
    });
  }

  shot(m: MonsterEntity, dirx: number, dirz: number, sp: MonsterSpecialDef): void {
    const g = this.game;
    const y = m.y + 0.9;
    const speed = sp.speed ?? 8.5;
    const r = sp.r ?? 0.4;
    const life = sp.life ?? 1.7;
    const mult = sp.mult ?? 1.0;
    const c = m.colors[2];
    const shot: ShotHazard = {
      kind: 'shot',
      src: m,
      x: m.x + dirx * 0.5,
      y,
      z: m.z + dirz * 0.5,
      vx: dirx * speed,
      vz: dirz * speed,
      r,
      left: life,
      mult,
      color: [c[0], c[1], c[2]],
      size: 0.5,
      gone: false,
    };
    this.list.push(shot);
    g.bus.emit('shot:launch', shot);
    g.bus.emit('monster:shot', m);
  }

  fall(m: MonsterEntity, x: number, z: number, r: number, delay: number, mult: number): void {
    const g = this.game;
    const y = g.world.surface(x, z);
    const c = m.colors[1];
    g.bus.emit('telegraph', { x, y, z, r, t: delay, fill: true });
    const h: FallHazard = {
      kind: 'fall',
      src: m,
      x,
      y: y + 16,
      z,
      ground: y,
      r,
      left: delay,
      drop: 16 / delay,
      mult,
      color: [c[0], c[1], c[2]],
      size: 0.8,
      gone: false,
    };
    this.list.push(h);
    g.bus.emit('shot:launch', h);
  }

  burst(m: MonsterEntity, r: number, delay: number, mult: number): void {
    const g = this.game;
    const y = g.world.surface(m.x, m.z);
    const c = m.colors[1];
    g.bus.emit('telegraph', { x: m.x, y, z: m.z, r, t: delay, fill: true });
    this.list.push({
      kind: 'fall',
      src: m,
      x: m.x,
      y,
      z: m.z,
      ground: y,
      r,
      left: delay,
      drop: 0,
      mult,
      color: [c[0], c[1], c[2]],
      size: 0,
      gone: false,
    });
  }

  clear(): void {
    for (const h of this.list) {
      if (h.kind !== 'cloud') h.gone = true;
    }
    this.list.length = 0;
  }

  update(dt: number): void {
    const g = this.game;
    const p = g.player;
    let w = 0;
    for (const h of this.list) {
      h.left -= dt;
      let done = h.left <= 0;
      if (h.kind === 'fall') {
        h.y = Math.max(h.ground, h.y - h.drop * dt);
        if (done) {
          g.bus.emit('slam', { x: h.x, y: h.ground, z: h.z, r: h.r });
          if (!p.dead && Math.hypot(p.x - h.x, p.z - h.z) < h.r) g.combat.hurt(h.src, h.mult);
        }
      } else if (h.kind === 'cloud') {
        h.next -= dt;
        if (h.next <= 0) {
          h.next = h.tick;
          if (!p.dead && Math.hypot(p.x - h.x, p.z - h.z) < h.r) {
            g.combat.hurt(h.src, h.mult, true);
          }
        }
      } else {
        h.x += h.vx * dt;
        h.z += h.vz * dt;
        if (g.world.surface(h.x, h.z) > h.y - 0.1) done = true;
        if (!done) {
          g.world.forEachProp(h.x, h.z, 1, (pr) => {
            if (
              pr.def.collide > 0 &&
              Math.hypot(pr.x - h.x, pr.z - h.z) < pr.def.collide * pr.scale + 0.15 &&
              h.y < pr.y + pr.def.height * pr.scale
            ) {
              done = true;
            }
          });
        }
        if (!done && !p.dead && Math.hypot(p.x - h.x, p.z - h.z) < h.r + p.radius) {
          g.combat.hurt(h.src, h.mult);
          done = true;
        }
        if (done) g.bus.emit('shot:hit', { x: h.x, y: h.y, z: h.z });
      }
      if (done) {
        if (h.kind !== 'cloud') h.gone = true;
        continue;
      }
      this.list[w++] = h;
    }
    this.list.length = w;
  }
}
