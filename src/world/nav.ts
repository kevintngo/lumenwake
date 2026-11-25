import type { Gate, NavLike, NavLink, RoomSpec, ZoneSpec } from '../types/world';
import { rimAt } from './layout';

export class Nav implements NavLike {
  readonly rooms: RoomSpec[];
  readonly links: NavLink[];
  readonly gates: Gate[];

  constructor(spec: ZoneSpec) {
    this.rooms = spec.rooms;
    const runtimeLinks: NavLink[] = spec.links.map((l) => {
      const a = spec.rooms[l.a];
      const b = spec.rooms[l.b];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      const ux = dx / len;
      const uz = dz / len;
      const ang = Math.atan2(ux, uz);
      const t0 = rimAt(a, ang) - 1.0;
      const t1 = len - (rimAt(b, ang + Math.PI) - 1.0);
      return {
        a: l.a,
        b: l.b,
        ax: a.x,
        az: a.z,
        ux,
        uz,
        len,
        w: l.w,
        t0,
        t1,
        ha: a.h,
        hb: b.h,
        ang,
        tmin: 0,
        tmax: len,
        gate: Boolean(l.gate),
        gap: l.gap ?? 0,
        part: 1,
      };
    });

    for (const l of [...runtimeLinks]) {
      if (!l.gap) continue;
      const mid = (l.t0 + l.t1) / 2;
      runtimeLinks.push({ ...l, tmin: mid + l.gap / 2, part: 2 });
      l.tmax = mid - l.gap / 2;
    }

    this.links = runtimeLinks;
    this.gates = [];
  }

  roomAt(x: number, z: number, margin = 0): number {
    for (const r of this.rooms) {
      const dx = x - r.x;
      const dz = z - r.z;
      const d = Math.hypot(dx, dz);
      if (d < r.r * 1.2 && d < rimAt(r, Math.atan2(dx, dz)) - margin) return r.i;
    }
    return -1;
  }

  linkAt(x: number, z: number, margin = 0): NavLink | null {
    for (const l of this.links) {
      const px = x - l.ax;
      const pz = z - l.az;
      const t = px * l.ux + pz * l.uz;
      if (t < l.tmin + (l.tmin > 0 ? margin : 0) || t > l.tmax - (l.tmax < l.len ? margin : 0)) continue;
      if (Math.abs(px * l.uz - pz * l.ux) < l.w / 2 - margin) return l;
    }
    return null;
  }

  inside(x: number, z: number, margin = 0.3): boolean {
    return this.roomAt(x, z, margin) >= 0 || this.linkAt(x, z, margin) !== null;
  }

  shut(x0: number, z0: number, x1: number, z1: number): boolean {
    for (const g of this.gates) {
      if (!g.shut) continue;
      const s0 = (x0 - g.x) * g.ux + (z0 - g.z) * g.uz;
      const s1 = (x1 - g.x) * g.ux + (z1 - g.z) * g.uz;
      if (s0 > 0 === s1 > 0 && Math.abs(s1) > 0.45) continue;
      const side = (x1 - g.x) * -g.uz + (z1 - g.z) * g.ux;
      if (Math.abs(side) < g.w / 2 + 0.6 && Math.abs(s1) < 0.6 + Math.abs(s0 - s1)) return true;
    }
    return false;
  }
}
