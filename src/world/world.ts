import { GAME, WORLD } from '../config';
import { propById } from '../data/props';
import type {
  BiomeDef,
  ChunkData,
  ChunkProp,
  Gate,
  RoomSpec,
  StructureInstance,
  WorldLike,
  WorldRaycastHit,
  ZoneSpec,
} from '../types/world';
import { Nav } from './nav';
import { createZone } from './zone';
import type { ZoneGenerator } from './zone';

const N = WORLD.CHUNK;
const keyOf = (cx: number, cz: number): number => (cx + 32768) * 65536 + (cz + 32768);

export class World implements WorldLike {
  readonly spec: ZoneSpec;
  readonly nav: Nav;
  readonly wall: number;
  readonly rooms: RoomSpec[];
  readonly structures: StructureInstance[];
  readonly gates: Gate[];
  private readonly gen: ZoneGenerator;
  private readonly chunks = new Map<number, ChunkData>();
  private last: ChunkData | null = null;

  constructor(spec: ZoneSpec) {
    this.spec = spec;
    this.nav = new Nav(spec);
    this.gen = createZone(spec, this.nav);
    this.wall = this.gen.biome.walls || 0;
    this.rooms = spec.rooms;
    this.structures = this.gen.structures;
    this.gates = this.gen.structures
      .filter((s) => s.role === 'gate' && s.linkIndex !== undefined)
      .map((s) => {
        const li = s.linkIndex as number;
        const l = this.nav.links[li];
        const g: Gate = {
          link: li,
          x: s.x,
          z: s.z,
          ux: l.ux,
          uz: l.uz,
          w: l.w,
          shut: true,
          st: s,
        };
        this.nav.gates.push(g);
        return g;
      });
  }

  chunk(cx: number, cz: number): ChunkData {
    const last = this.last;
    if (last && last.cx === cx && last.cz === cz) return last;
    const k = keyOf(cx, cz);
    let c = this.chunks.get(k);
    if (!c) {
      c = this.gen.generateChunk(cx, cz);
      this.chunks.set(k, c);
    }
    this.last = c;
    return c;
  }

  setState(st: StructureInstance, pal: number): [number, number][] {
    st.pal = pal;
    const def = propById(st.id);
    const R = (def ? def.reach : 0) * st.scale + 1;
    const out: [number, number][] = [];
    for (let cz = Math.floor((st.z - R) / N); cz <= Math.floor((st.z + R) / N); cz++) {
      for (let cx = Math.floor((st.x - R) / N); cx <= Math.floor((st.x + R) / N); cx++) {
        this.chunks.delete(keyOf(cx, cz));
        out.push([cx, cz]);
      }
    }
    this.last = null;
    return out;
  }

  texel(ix: number, iz: number): number {
    const cx = Math.floor(ix / N);
    const cz = Math.floor(iz / N);
    const h = this.chunk(cx, cz).height;
    const o = ((iz - cz * N) * N + (ix - cx * N)) * 4;
    return h[o] + (this.wall && h[o + 3] > 0.05 ? this.wall : 0);
  }

  height(x: number, z: number): number {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;
    const a = this.texel(ix, iz);
    const b = this.texel(ix + 1, iz);
    const c = this.texel(ix, iz + 1);
    const d = this.texel(ix + 1, iz + 1);
    return a + (b - a) * fx + (c + (d - c) * fx - (a + (b - a) * fx)) * fz;
  }

  surface(x: number, z: number): number {
    return Math.max(this.height(x, z), WORLD.SEA);
  }

  biome(_x?: number, _z?: number): BiomeDef {
    return this.gen.biome;
  }

  roomAt(x: number, z: number, margin = 0): number {
    return this.nav.roomAt(x, z, margin);
  }

  walkable(x: number, z: number): boolean {
    return this.nav.inside(x, z, 0.35);
  }

  forEachProp(x: number, z: number, radius: number, fn: (pr: ChunkProp) => void): void {
    const m = radius + 4;
    const cx0 = Math.floor((x - m) / N);
    const cx1 = Math.floor((x + m) / N);
    const cz0 = Math.floor((z - m) / N);
    const cz1 = Math.floor((z + m) / N);
    for (let cz = cz0; cz <= cz1; cz++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const props = this.chunk(cx, cz).props;
        for (let i = 0; i < props.length; i++) {
          const p = props[i];
          const dx = p.x - x;
          const dz = p.z - z;
          if (dx * dx + dz * dz <= m * m) fn(p);
        }
      }
    }
  }

  moveCircle(
    x: number,
    z: number,
    dx: number,
    dz: number,
    radius: number,
    out: { x: number; z: number } = { x: 0, z: 0 },
    feet?: number | null,
  ): { x: number; z: number } {
    const nav = this.nav;
    const m = 0.35;
    const air = feet != null;
    const here = air ? 0 : this.surface(x, z);
    const wall = (ax: number, az: number): boolean =>
      air
        ? Boolean(this.wall || nav.inside(ax, az, 0)) && this.surface(ax, az) - (feet as number) > 0.3
        : this.surface(ax, az) - here > GAME.STEEP * Math.max(Math.hypot(ax - x, az - z), 0.03);
    const open = (ax: number, az: number): boolean =>
      !this.wall || nav.inside(ax, az, 0.05) || this.gen.inPit(ax, az);
    const ok = (ax: number, az: number): boolean =>
      (air ? open(ax, az) : nav.inside(ax, az, m)) && !nav.shut(x, z, ax, az) && !wall(ax, az);

    let nx = x + dx;
    let nz = z + dz;
    if (!ok(nx, nz)) {
      if (ok(nx, z)) nz = z;
      else if (ok(x, nz)) nx = x;
      else {
        nx = x;
        nz = z;
      }
    }

    this.forEachProp(nx, nz, radius, (p) => {
      const cr = p.def.collide * p.scale;
      if (cr <= 0 || ('role' in p && (p as { role?: string }).role === 'gate')) return;
      const ox = nx - p.x;
      const oz = nz - p.z;
      const d = Math.hypot(ox, oz);
      const min = cr + radius;
      if (d < min && d > 1e-4) {
        const px = p.x + (ox / d) * min;
        const pz = p.z + (oz / d) * min;
        if (air ? open(px, pz) : nav.inside(px, pz, m)) {
          nx = px;
          nz = pz;
        }
      }
    });

    out.x = nx;
    out.z = nz;
    return out;
  }

  raycast(ro: readonly number[], rd: readonly number[], maxDist = 220): WorldRaycastHit | null {
    let t = 0;
    for (let i = 0; i < 260 && t < maxDist; i++) {
      const x = ro[0] + rd[0] * t;
      const y = ro[1] + rd[1] * t;
      const z = ro[2] + rd[2] * t;
      const above = y - this.surface(x, z);
      if (above < 0.02) return { x, z };
      t += Math.max(0.05, above * 0.45);
    }
    return null;
  }
}
