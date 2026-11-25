// The world as gameplay sees it: one zone at a time (the ship's deck, or the
// place a mission is in), a cache of its chunks, and the queries every system
// needs: floor height, where a body may stand, what is in the way. The renderer
// reads the same chunks to fill the GPU textures.

import { GAME, WORLD } from '../config.js';
import { Nav } from './nav.js';
import { createZone } from './zone.js';

const N = WORLD.CHUNK;
const keyOf = (cx, cz) => (cx + 32768) * 65536 + (cz + 32768);

export class World {
  /** spec: a layout from world/layout.js ({ id, biome, seed, rooms, links, start, fixtures? }) */
  constructor(spec) {
    this.spec = spec;
    this.seed = spec.seed;
    this.nav = new Nav(spec);
    this.gen = createZone(spec, this.nav);
    this.rooms = spec.rooms;
    this.structures = this.gen.structures;
    this.chunks = new Map();
    this.last = null;
    this.blocked = [];      // extra circles in the way that are not props (set by the game)
    // a gate is a line across its bridge; shut until the game opens it
    this.gates = this.structures.filter((s) => s.role === 'gate').map((s) => {
      const g = { st: s, x: s.x, z: s.z, nx: s.link.ux, nz: s.link.uz, half: s.link.w / 2, shut: true, link: s.link };
      this.nav.gates.push(g);
      return g;
    });
  }

  chunk(cx, cz) {
    const last = this.last;
    if (last && last.cx === cx && last.cz === cz) return last;
    const k = keyOf(cx, cz);
    let c = this.chunks.get(k);
    if (!c) this.chunks.set(k, (c = this.gen.generateChunk(cx, cz)));
    return (this.last = c);
  }
  hasChunk(cx, cz) { return this.chunks.has(keyOf(cx, cz)); }
  prune() {}

  /**
   * Changes how a fixture is drawn (a gate opened, a pod emptied): `pal` is the state its shader reads.
   * Returns the chunks [cx, cz] that have to be drawn again.
   */
  setState(st, pal) {
    st.pal = pal;
    const R = st.def.reach * st.scale + 1, out = [];
    for (let cz = Math.floor((st.z - R) / N); cz <= Math.floor((st.z + R) / N); cz++) {
      for (let cx = Math.floor((st.x - R) / N); cx <= Math.floor((st.x + R) / N); cx++) {
        this.chunks.delete(keyOf(cx, cz));
        out.push([cx, cz]);
      }
    }
    this.last = null;
    return out;
  }

  texel(ix, iz) {
    const cx = Math.floor(ix / N), cz = Math.floor(iz / N);
    return this.chunk(cx, cz).height[((iz - cz * N) * N + (ix - cx * N)) * 4];
  }
  /** Ground height, bilinear over the same samples the GPU interpolates. */
  height(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
    const a = this.texel(ix, iz), b = this.texel(ix + 1, iz);
    const c = this.texel(ix, iz + 1), d = this.texel(ix + 1, iz + 1);
    return a + (b - a) * fx + (c + (d - c) * fx - (a + (b - a) * fx)) * fz;
  }
  /** Height of whatever is drawn here: the ground, or the top of the cloud. */
  surface(x, z) { return Math.max(this.height(x, z), WORLD.SEA); }
  waterDepth() { return 0; }
  slope(x, z) {
    return Math.hypot(this.height(x + 0.6, z) - this.height(x - 0.6, z), this.height(x, z + 0.6) - this.height(x, z - 0.6)) / 1.2;
  }
  biome() { return this.gen.biome; }
  /** A room index, or -1. */
  roomAt(x, z, margin = 0) { return this.nav.roomAt(x, z, margin); }
  /** Floor a walker can stand on: inside a room or on a bridge. */
  walkable(x, z) { return this.nav.inside(x, z, 0.35); }

  /** Calls fn(prop) for every prop whose origin is within `radius` (+ margin) of the point. */
  forEachProp(x, z, radius, fn) {
    const m = radius + 4;
    const cx0 = Math.floor((x - m) / N), cx1 = Math.floor((x + m) / N);
    const cz0 = Math.floor((z - m) / N), cz1 = Math.floor((z + m) / N);
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) {
      const props = this.chunk(cx, cz).props;
      for (let i = 0; i < props.length; i++) {
        const p = props[i];
        const dx = p.x - x, dz = p.z - z;
        if (dx * dx + dz * dz <= m * m) fn(p);
      }
    }
  }

  /**
   * Moves a circle from (x, z) by (dx, dz), sliding along rims, props and shut gates. Returns the new position in `out`.
   * Ground that rises too steeply ahead (the side of a terrace) is a wall to anything on foot.
   * `feet`: the mover is in the air with its feet this high, so it may cross where there is no floor (and may
   * come down in the cloud), and only ground higher than its feet stops it.
   */
  moveCircle(x, z, dx, dz, radius, out, feet) {
    const nav = this.nav, m = 0.35, air = feet !== undefined, here = air ? 0 : this.surface(x, z);
    const wall = (ax, az) => (air
      ? nav.inside(ax, az, 0) && this.surface(ax, az) - feet > 0.3
      : this.surface(ax, az) - here > GAME.STEEP * Math.max(Math.hypot(ax - x, az - z), 0.03));
    const ok = (ax, az) => (air || nav.inside(ax, az, m)) && !nav.shut(x, z, ax, az) && !wall(ax, az);
    let nx = x + dx, nz = z + dz;
    if (!ok(nx, nz)) {
      if (ok(nx, z)) nz = z;
      else if (ok(x, nz)) nx = x;
      else { nx = x; nz = z; }
    }
    this.forEachProp(nx, nz, radius, (p) => {
      const cr = p.def.collide * p.scale;
      if (cr <= 0 || (p.role === 'gate')) return;
      const ox = nx - p.x, oz = nz - p.z, d = Math.hypot(ox, oz), min = cr + radius;
      if (d < min && d > 1e-4) {
        const px = p.x + ox / d * min, pz = p.z + oz / d * min;
        if (air || nav.inside(px, pz, m)) { nx = px; nz = pz; }
      }
    });
    out.x = nx; out.z = nz;
    return out;
  }

  /** First ground hit of a ray, by stepping (used for mouse picking). */
  raycast(ro, rd, maxDist = 220) {
    let t = 0;
    for (let i = 0; i < 260 && t < maxDist; i++) {
      const x = ro[0] + rd[0] * t, y = ro[1] + rd[1] * t, z = ro[2] + rd[2] * t;
      const above = y - this.surface(x, z);
      if (above < 0.02) return { x, y: y - above, z, t };
      t += Math.max(0.05, above * 0.45);
    }
    return null;
  }
}
