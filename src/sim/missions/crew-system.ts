import { damp, dampAngle } from '../../core/math';
import type { NpcEntity } from '../../types/entity';
import type { GameContext, SimSystem } from '../../types/game-context';
import { yawFromDir } from '../entities';

const PACE = 1.5;
const out = { x: 0, z: 0 };

export class Crew implements SimSystem {
  private readonly game: GameContext;

  constructor(game: GameContext) {
    this.game = game;
  }

  update(dt: number): void {
    const g = this.game;
    const p = g.player;
    for (const ent of g.entities.list) {
      if (ent.kind !== 'npc') continue;
      const e = ent as NpcEntity;
      if (!e.path || !e.path.length) continue;
      const [tx, tz] = e.path[e.pathIdx];
      const dx = tx - e.x;
      const dz = tz - e.z;
      const d = Math.hypot(dx, dz);
      const near = Math.hypot(p.x - e.x, p.z - e.z) < 2.4;
      let moving = 0;
      if (near) {
        e.yaw = dampAngle(e.yaw, yawFromDir(p.x - e.x, p.z - e.z), 8, dt);
      } else if (d < 0.4) {
        if ((e.pauseT -= dt) <= 0) {
          e.pathIdx = (e.pathIdx + 1) % e.path.length;
          e.pauseT = 2 + ((e.id * 7) % 5);
        }
      } else {
        const step = Math.min(PACE * dt, d);
        g.world.moveCircle(e.x, e.z, (dx / d) * step, (dz / d) * step, e.radius, out);
        const moved = Math.hypot(out.x - e.x, out.z - e.z);
        if (moved < step * 0.2) {
          e.pathIdx = (e.pathIdx + 1) % e.path.length;
        }
        e.x = out.x;
        e.z = out.z;
        e.y = g.world.surface(e.x, e.z);
        e.walk += moved * 4.4;
        e.yaw = dampAngle(e.yaw, yawFromDir(dx, dz), 9, dt);
        moving = 0.55;
      }
      e.move = damp(e.move, moving, 10, dt);
    }
  }
}
