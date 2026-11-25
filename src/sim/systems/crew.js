// The town's people going about their day: anyone with a `path` (a round of
// points, content/town.js) walks it, stopping a while at each.

import { damp, dampAngle } from '../../core/math.js';
import { yawFromDir } from '../entities.js';

const PACE = 1.5;
const out = { x: 0, z: 0 };

export class Crew {
  constructor(game) { this.game = game; }

  update(dt) {
    const g = this.game, p = g.player;
    for (const e of g.entities.list) {
      if (e.kind !== 'npc' || !e.path) continue;
      const [tx, tz] = e.path[e.at];
      const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
      // stops for the surveyor, and at each point of its round
      const near = Math.hypot(p.x - e.x, p.z - e.z) < 2.4;
      let moving = 0;
      if (near) e.yaw = dampAngle(e.yaw, yawFromDir(p.x - e.x, p.z - e.z), 8, dt);
      else if (d < 0.4) { if ((e.wait -= dt) <= 0) { e.at = (e.at + 1) % e.path.length; e.wait = 2 + (e.id * 7 % 5); } }
      else {
        const step = Math.min(PACE * dt, d);
        g.world.moveCircle(e.x, e.z, dx / d * step, dz / d * step, e.radius, out);
        const moved = Math.hypot(out.x - e.x, out.z - e.z);
        if (moved < step * 0.2) { e.at = (e.at + 1) % e.path.length; }       // something in the way: try the next point
        e.x = out.x; e.z = out.z; e.y = g.world.surface(e.x, e.z);
        e.walk += moved * 4.4;
        e.yaw = dampAngle(e.yaw, yawFromDir(dx, dz), 9, dt);
        moving = 0.55;
      }
      e.move = damp(e.move, moving, 10, dt);
    }
  }
}
