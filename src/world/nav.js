// Where a body may stand in a zone, and how high the floor is there. A zone's
// floor is the union of its rooms and bridges; props and shut gates are in the
// way. Everything that walks goes through move().

import { rimAt } from './layout.js';

export class Nav {
  constructor(spec) {
    this.rooms = spec.rooms;
    this.links = spec.links.map((l) => {
      const a = spec.rooms[l.a], b = spec.rooms[l.b];
      const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
      const ang = Math.atan2(ux, uz);
      // the bridge proper runs from rim to rim (a little inside each)
      const t0 = rimAt(a, ang) - 1.0, t1 = len - (rimAt(b, ang + Math.PI) - 1.0);
      return { ...l, ax: a.x, az: a.z, ux, uz, len, t0, t1, ha: a.h, hb: b.h, ang };
    });
    this.blocks = [];       // { x, z, r }: things that stand in the way
    this.gates = [];        // { x, z, nx, nz, half, shut }: a line across a bridge
  }

  /** Which room a point is in (-1: none). `margin` keeps a body that far in from the rim. */
  roomAt(x, z, margin = 0) {
    for (const r of this.rooms) {
      const dx = x - r.x, dz = z - r.z, d = Math.hypot(dx, dz);
      if (d < r.r * 1.2 && d < rimAt(r, Math.atan2(dx, dz)) - margin) return r.i;
    }
    return -1;
  }
  /** The bridge a point is on, or null. */
  linkAt(x, z, margin = 0) {
    for (const l of this.links) {
      const px = x - l.ax, pz = z - l.az;
      const t = px * l.ux + pz * l.uz;
      if (t < 0 || t > l.len) continue;
      if (Math.abs(px * l.uz - pz * l.ux) < l.w / 2 - margin) { l.t = t; return l; }
    }
    return null;
  }
  inside(x, z, margin = 0.3) { return this.roomAt(x, z, margin) >= 0 || this.linkAt(x, z, margin) !== null; }

  /** Floor height. Bridges ramp from one room's height to the other's. */
  height(x, z) {
    const i = this.roomAt(x, z);
    if (i >= 0) return this.rooms[i].h;
    const l = this.linkAt(x, z);
    if (l) return rampHeight(l, l.t);
    // off the floor: the nearest room's
    let best = this.rooms[0], bd = 1e9;
    for (const r of this.rooms) { const d = Math.hypot(x - r.x, z - r.z) - r.r; if (d < bd) { bd = d; best = r; } }
    return best.h;
  }

  shut(x0, z0, x1, z1) {
    for (const g of this.gates) {
      if (!g.shut) continue;
      const s0 = (x0 - g.x) * g.nx + (z0 - g.z) * g.nz, s1 = (x1 - g.x) * g.nx + (z1 - g.z) * g.nz;
      if ((s0 > 0) === (s1 > 0) && Math.abs(s1) > 0.45) continue;
      const side = (x1 - g.x) * -g.nz + (z1 - g.z) * g.nx;
      if (Math.abs(side) < g.half + 0.6 && Math.abs(s1) < 0.6 + Math.abs(s0 - s1)) return true;
    }
    return false;
  }

  /** Moves a circle from (x, z) by (dx, dz), sliding along rims, props and shut gates. Writes out.x, out.z. */
  move(x, z, dx, dz, radius, out) {
    let nx = x + dx, nz = z + dz;
    const m = radius * 0.6 + 0.15;
    if (!this.inside(nx, nz, m) || this.shut(x, z, nx, nz)) {
      if (this.inside(nx, z, m) && !this.shut(x, z, nx, z)) nz = z;
      else if (this.inside(x, nz, m) && !this.shut(x, z, x, nz)) nx = x;
      else { nx = x; nz = z; }
    }
    for (const b of this.blocks) {
      const ox = nx - b.x, oz = nz - b.z, min = b.r + radius;
      if (Math.abs(ox) > min || Math.abs(oz) > min) continue;
      const d = Math.hypot(ox, oz);
      if (d < min && d > 1e-4) {
        const px = b.x + ox / d * min, pz = b.z + oz / d * min;
        if (this.inside(px, pz, m)) { nx = px; nz = pz; }
      }
    }
    out.x = nx; out.z = nz;
    return out;
  }

  /** A free spot in a room: at least `clear` from every prop, `pad` in from the rim. */
  spot(room, rnd, clear = 1.2, pad = 1.6, minR = 0) {
    for (let k = 0; k < 40; k++) {
      const a = rnd() * Math.PI * 2, d = minR + Math.sqrt(rnd()) * (rimAt(room, a) - pad - minR);
      const x = room.x + Math.sin(a) * d, z = room.z + Math.cos(a) * d;
      if (this.blocks.every((b) => Math.hypot(b.x - x, b.z - z) > b.r + clear)) return { x, z };
    }
    return { x: room.x, z: room.z };
  }
}

export function rampHeight(l, t) {
  const k = Math.min(1, Math.max(0, (t - l.t0) / Math.max(0.01, l.t1 - l.t0)));
  return l.ha + (l.hb - l.ha) * (k * k * (3 - 2 * k));
}
