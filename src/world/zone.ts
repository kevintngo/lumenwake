import { WORLD } from '../config';
import { clamp, lerp, smoothstep } from '../core/math';
import { fbm2, hash01, mulberry32, noise2 } from '../core/rng';
import { biomeById } from '../data/biomes';
import { propById } from '../data/props';
import { SITES } from '../data/sites';
import type { PropDef, PropId } from '../types/domain';
import type {
  BiomeDef,
  ChunkData,
  ChunkProp,
  LandmarkId,
  NavLike,
  NavLink,
  RoomSpec,
  StructureInstance,
  ZoneSpec,
} from '../types/world';
import { rimAt } from './layout';

/** a landmark's pieces around its middle: [prop, x, z, scale] */
type Piece = readonly [PropId, number, number, number];

const LANDMARKS: Readonly<Record<LandmarkId, readonly Piece[]>> = {
  circle: [
    ['stone', 3.3, 0, 1.0],
    ['stone', 1.65, 2.86, 1.12],
    ['stone', -1.65, 2.86, 0.95],
    ['stone', -3.3, 0, 1.15],
    ['stone', -1.65, -2.86, 1.0],
    ['stone', 1.65, -2.86, 0.9],
    ['flowers', 0, 0, 1.2],
  ],
  grove: [
    ['tree', 0, 0, 1.85],
    ['bush', 2.9, 0.9, 1.15],
    ['bush', -2.5, 1.7, 1.0],
    ['flowers', 1.3, -2.8, 1.2],
    ['fern', -1.6, -2.6, 1.2],
  ],
  crystals: [
    ['crystal', 0, 0, 1.9],
    ['crystal', 1.9, 1.0, 1.3],
    ['crystal', -1.6, 1.5, 1.5],
    ['crystal', 0.5, -2.0, 1.1],
    ['pebbles', -2.2, -1.4, 1.3],
  ],
  ruins: [
    ['ruin', 0, 0, 1.0],
    ['column', 3.0, -1.6, 1.0],
    ['pebbles', -2.6, -2.0, 1.3],
    ['tallgrass', 1.8, 2.6, 1.2],
  ],
  bigcaps: [
    ['bigcap', 0, 0, 1.25],
    ['bigcap', 2.7, 1.2, 0.9],
    ['bigcap', -1.9, 2.2, 1.05],
    ['mushroom', 1.2, -2.2, 1.3],
    ['fern', -2.2, -1.5, 1.1],
  ],
  pines: [
    ['pine', 0, 0, 1.4],
    ['pine', 2.7, 1.1, 1.15],
    ['pine', -2.4, 1.7, 1.25],
    ['stump', 1.4, -2.2, 1.2],
    ['cairn', -1.6, -2.3, 1.2],
  ],
  shards: [
    ['shard', 0, 0, 1.1],
    ['shard', 2.6, 1.3, 0.85],
    ['floater', -2.2, 1.5, 1.15],
    ['crystal', 1.1, -2.2, 1.2],
  ],
  spires: [
    ['stone', 0, 0, 1.25],
    ['cairn', 2.4, 1.2, 1.3],
    ['stone', -2.0, 1.6, 0.95],
    ['pebbles', 0.8, -2.3, 1.4],
  ],
  corals: [
    ['crystal', 0, 0, 1.6],
    ['bush', 2.4, 1.1, 1.2],
    ['flowers', -2.1, 1.5, 1.3],
    ['pebbles', 1.0, -2.2, 1.3],
  ],
  lanterns: [
    ['willow', 0, 0, 1.15],
    ['reeds', 2.5, 1.0, 1.2],
    ['flowers', -2.2, 1.6, 1.2],
    ['reeds', 1.0, -2.3, 1.1],
  ],
};

const N = WORLD.CHUNK;
const CELL = WORLD.CELL;
const CPC = N / CELL;
const DEEP = -6;

interface ZoneStructure extends StructureInstance {
  def: PropDef;
  type: number;
  y: number;
  linkIndex?: number;
}

export interface ZoneGenerator {
  readonly biome: BiomeDef;
  readonly structures: ZoneStructure[];
  inPit(x: number, z: number): boolean;
  generateChunk(cx: number, cz: number): ChunkData;
}

function getProp(id: PropId): PropDef {
  const def = propById(id);
  if (!def) throw new Error(`Unknown prop: ${id}`);
  return def;
}

export function createZone(spec: ZoneSpec, nav: NavLike): ZoneGenerator {
  const S = spec.seed | 0;
  const foundBiome = biomeById(spec.biome);
  if (!foundBiome) throw new Error(`Unknown biome: ${spec.biome}`);
  const B: BiomeDef = foundBiome;
  const rooms = spec.rooms;
  const links = nav.links;
  const WALL = B.walls || 0;

  let nearH = 0;
  let nearLink: NavLink | null = null;
  let nearRoom: RoomSpec | null = null;

  function dist(x: number, z: number): number {
    let best = 1e9;
    nearLink = null;
    nearRoom = null;
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      const dx = x - r.x;
      const dz = z - r.z;
      const d0 = Math.hypot(dx, dz);
      if (d0 - r.r * 1.25 > best) continue;
      const d = d0 - rimAt(r, Math.atan2(dx, dz));
      if (d < best) {
        best = d;
        nearH = r.h;
        nearRoom = r;
      }
    }
    for (const l of links) {
      const px = x - l.ax;
      const pz = z - l.az;
      const along = px * l.ux + pz * l.uz;
      const t = clamp(along, l.tmin, l.tmax);
      let d = Math.hypot(px - l.ux * t, pz - l.uz * t) - l.w / 2;
      const past = Math.max(l.tmin > 0 ? l.tmin - along : -1, l.tmax < l.len ? along - l.tmax : -1);
      if (past > 0) d = Math.hypot(past, Math.max(Math.abs(px * l.uz - pz * l.ux) - l.w / 2, 0));
      if (d < best) {
        best = d;
        nearRoom = null;
        nearLink = l;
        const k = clamp((t - l.t0) / Math.max(0.01, l.t1 - l.t0), 0, 1);
        nearH = l.ha + (l.hb - l.ha) * (k * k * (3 - 2 * k));
      }
    }
    return best;
  }

  let pitSide = 0;

  function pitAt(x: number, z: number): number {
    let best = 4;
    if (WALL) {
      for (const l of links) {
        if (!l.gap || l.part === 2) continue;
        const px = x - l.ax;
        const pz = z - l.az;
        const along = px * l.ux + pz * l.uz;
        const side = Math.abs(px * l.uz - pz * l.ux) - l.w / 2;
        const d = Math.max(l.tmax - along, along - l.tmax - l.gap, side);
        if (d < best) {
          best = d;
          pitSide = side;
        }
      }
    }
    return best;
  }

  const inPit = (x: number, z: number): boolean => pitAt(x, z) < 0;

  function height(x: number, z: number): number {
    const d = dist(x, z);
    const base = nearH;
    if (WALL && d > 0) return base;
    if (d <= 0) {
      if (!nearRoom) return base;
      const pl = nearRoom.terrace;
      if (pl && Math.hypot(x - pl.x, z - pl.z) < pl.r) return base + pl.h;
      const flat =
        nearRoom.kind === 'boss'
          ? 0.25
          : nearRoom.kind === 'start' || nearRoom.kind === 'exit'
            ? smoothstep(3.5, 6.5, Math.hypot(x - nearRoom.x, z - nearRoom.z))
            : 1;
      return base + fbm2(x * 0.07, z * 0.07, 2, S + 7) * B.roll * smoothstep(0, -3, d) * flat * 0.6;
    }
    const lip = Math.min(d, 0.6) * 0.8;
    const face =
      Math.max(0, d - 0.6) * 8 +
      (d > 0.6 ? 1.6 * noise2(x * 0.35, z * 0.35, S + 9) * Math.min(1, d - 0.6) : 0);
    return Math.max(base - lip - face, DEEP);
  }

  const structures: ZoneStructure[] = [];
  const rnd = mulberry32((S ^ 0x5bd1e995) >>> 0);
  const keep: { x: number; z: number; r: number; soft?: boolean }[] = [];
  const taken = new Set<string>();

  const patches = (x: number, z: number, R: number): string[] => {
    const out: string[] = [];
    for (let cj = Math.floor((z - R) / CELL); cj <= Math.floor((z + R) / CELL); cj++) {
      for (let ci = Math.floor((x - R) / CELL); ci <= Math.floor((x + R) / CELL); ci++) {
        if (Math.hypot(clamp(x, ci * CELL, (ci + 1) * CELL) - x, clamp(z, cj * CELL, (cj + 1) * CELL) - z) < R) {
          out.push(`${ci},${cj}`);
        }
      }
    }
    return out;
  };

  const clear = (id: PropId, x: number, z: number, scale = 1): boolean =>
    patches(x, z, getProp(id).reach * scale).every((k) => !taken.has(k));

  const build = (
    id: PropId,
    x: number,
    z: number,
    more: Partial<ZoneStructure> = {},
  ): ZoneStructure => {
    const def = getProp(id);
    const st: ZoneStructure = {
      id,
      def,
      type: def.type,
      x,
      z,
      y: 0,
      scale: 1,
      rot: 0,
      seed: rnd(),
      pal: 0,
      room: -1,
      ...more,
    };
    st.y = height(x, z) - 0.04;
    structures.push(st);
    for (const k of patches(x, z, def.reach * st.scale)) taken.add(k);
    keep.push({ x, z, r: def.reach * st.scale + 0.6 });
    return st;
  };

  function onLink(x: number, z: number, margin: number): boolean {
    for (const l of links) {
      const px = x - l.ax;
      const pz = z - l.az;
      const t = px * l.ux + pz * l.uz;
      if (t > l.tmin - 1 && t < l.tmax + 1 && Math.abs(px * l.uz - pz * l.ux) < l.w / 2 + margin) {
        return true;
      }
    }
    return false;
  }

  /** on a bridge between islands, or its ends: the stretch a flower would block, not the whole line across an island */
  function onBridge(x: number, z: number, margin: number): boolean {
    for (const l of links) {
      const px = x - l.ax;
      const pz = z - l.az;
      const t = px * l.ux + pz * l.uz;
      if (t > l.t0 - 2.5 && t < l.t1 + 2.5 && Math.abs(px * l.uz - pz * l.ux) < l.w / 2 + margin) return true;
    }
    return false;
  }

  for (const r of rooms) {
    if (r.kind === 'start') build('pad', r.x, r.z, { room: r.i, role: 'arrive' });
    if (r.kind === 'exit') build('pad', r.x, r.z, { room: r.i, role: 'leave', pal: 1 });
    if (r.terrace) keep.push({ x: r.terrace.x, z: r.terrace.z, r: r.terrace.r + 1.4, soft: true });
    keep.push({
      x: r.x,
      z: r.z,
      r: r.clear ?? (r.kind === 'boss' ? r.r * 0.8 : r.kind === 'cache' ? 2.5 : r.r * 0.3),
      // the open middle of a fight island keeps out trees and rocks, not flowers
      soft: !spec.hub && (r.kind === 'fight' || r.kind === 'boss'),
    });
  }

  for (let li = 0; li < links.length; li++) {
    const l = links[li];
    if (l.gate && l.part !== 2) {
      const t = l.t0 + 1.2;
      build('gate', l.ax + l.ux * t, l.az + l.uz * t, {
        rot: -l.ang,
        linkIndex: li,
        role: 'gate',
        scale: l.w / 4.6,
      });
    }
    const t = l.t1 + 0.4;
    const s = (l.a + l.b) % 2 ? 1 : -1;
    const lx = l.ax + l.ux * t + l.uz * s * (l.w / 2 + 1.1);
    const lz = l.az + l.uz * t - l.ux * s * (l.w / 2 + 1.1);
    if (!spec.hub && l.part !== 2 && clear('lamp', lx, lz)) build('lamp', lx, lz);
  }

  if (WALL) {
    for (const r of rooms) {
      if (r.kind === 'start' || r.kind === 'stone') continue;
      const n = r.kind === 'boss' ? 4 : 2;
      const a0 = Math.PI / 4 + ((r.i % 2) * Math.PI) / 2;
      for (let k = 0; k < n; k++) {
        const a = a0 + k * (n === 4 ? Math.PI / 2 : Math.PI);
        const d = rimAt(r, a) - 2.4;
        const x = r.x + Math.sin(a) * d;
        const z = r.z + Math.cos(a) * d;
        if (!onLink(x, z, 2.6) && clear('brazier', x, z)) build('brazier', x, z, { room: r.i });
      }
    }
  }

  for (const f of spec.fixtures || []) build(f.id, f.x, f.z, f);

  for (const r of rooms) {
    if (r.terrace) {
      build('pod', r.terrace.x, r.terrace.z, {
        room: r.i,
        role: 'pod',
        terrace: true,
        rot: rnd() * 6.283,
      });
    }
  }

  for (const r of rooms) {
    for (let k = 0; k < (r.pods || 0); k++) {
      for (let tries = 0; tries < 30; tries++) {
        const a = rnd() * 6.283;
        const d = (r.kind === 'cache' ? 0.15 + rnd() * 0.4 : 0.5 + rnd() * 0.3) * rimAt(r, a);
        const x = r.x + Math.sin(a) * d;
        const z = r.z + Math.cos(a) * d;
        if (keep.some((k2) => Math.hypot(k2.x - x, k2.z - z) < k2.r + 1.6) && r.kind !== 'cache') continue;
        if (structures.some((o) => Math.hypot(o.x - x, o.z - z) < 4.6 + o.def.reach * o.scale + 1.0)) continue;
        if (onLink(x, z, 2.2)) continue;
        build('pod', x, z, { room: r.i, role: 'pod', rot: rnd() * 6.283 });
        break;
      }
    }
  }

  for (const r of rooms) {
    for (const id of r.sites || []) {
      const siteDef = SITES[id];
      const reach = getProp(siteDef.prop).reach * (siteDef.scale || 1);
      for (let tries = 0; tries < 90; tries++) {
        const a = rnd() * 6.283;
        const d = (r.kind === 'cache' ? 0.08 + rnd() * 0.62 : 0.42 + rnd() * 0.4) * rimAt(r, a);
        const x = r.x + Math.sin(a) * d;
        const z = r.z + Math.cos(a) * d;
        if (
          structures.some(
            (o) => Math.hypot(o.x - x, o.z - z) < (tries < 60 ? 5.2 : 4.3) + o.def.reach * o.scale + reach,
          )
        ) {
          continue;
        }
        if (onLink(x, z, 2.6)) continue;
        build(siteDef.prop, x, z, {
          room: r.i,
          role: 'site',
          site: id,
          scale: siteDef.scale || 1,
          rot: rnd() * 6.283,
        });
        break;
      }
    }
  }

  const leafPal = (k: number): number => B.leaf[Math.floor(k * B.leaf.length) % B.leaf.length];
  const VEG = new Set<PropId>(['tree', 'pine', 'bush', 'willow', 'bigcap', 'fern', 'tallgrass', 'reeds']);

  /** one set piece off to the side of a fight island (two round an elder's), built from props that fit */
  function landmark(r: RoomSpec, kind: LandmarkId, lo: number, hi: number): boolean {
    const pieces = LANDMARKS[kind];
    for (let tries = 0; tries < 40; tries++) {
      const a = rnd() * 6.283;
      const d = (lo + rnd() * (hi - lo)) * rimAt(r, a);
      const x = r.x + Math.sin(a) * d;
      const z = r.z + Math.cos(a) * d;
      if (onLink(x, z, 4.5) || dist(x, z) > -4.2) continue;
      if (structures.some((o) => Math.hypot(o.x - x, o.z - z) < 4.2 + o.def.reach * o.scale)) continue;
      const turn = rnd() * 6.283;
      const c = Math.cos(turn);
      const sn = Math.sin(turn);
      let placed = 0;
      for (const [id, px, pz, sc] of pieces) {
        const bx = x + px * c - pz * sn;
        const bz = z + px * sn + pz * c;
        const def = getProp(id);
        if (!clear(id, bx, bz, sc) || onLink(bx, bz, 1.4) || dist(bx, bz) > -def.reach * sc * 0.7 - 0.3) continue;
        build(id, bx, bz, {
          room: r.i,
          scale: sc,
          rot: rnd() * 6.283,
          pal: id === 'flowers' ? Math.floor(rnd() * 6) : VEG.has(id) ? leafPal(rnd()) : 0,
        });
        placed++;
      }
      if (placed) keep.push({ x, z, r: 3.6, soft: true });
      return placed > 0;
    }
    return false;
  }

  if (B.landmarks && B.landmarks.length && !spec.hub) {
    for (const r of rooms) {
      if (r.kind !== 'fight' && r.kind !== 'boss') continue;
      const kinds = B.landmarks;
      const first = Math.floor(rnd() * kinds.length);
      if (r.kind === 'boss') {
        landmark(r, kinds[first], 0.83, 0.9);
        landmark(r, kinds[(first + 1) % kinds.length], 0.83, 0.9);
      } else if (rnd() < 0.85) {
        landmark(r, kinds[first], 0.55, 0.72);
      }
    }
  }

  type Row = readonly [PropId, number, number, number?];

  function cellProp(ccx: number, ccz: number): ChunkProp | null {
    if (!B.props.length) return null;
    const cxw = (ccx + 0.5) * CELL;
    const czw = (ccz + 0.5) * CELL;
    const d = dist(cxw, czw);
    if (d > -1.4 || !nearRoom) return null;
    const room = nearRoom;
    // trees and rocks thicken toward the rim, in a band narrow enough to leave the middle to meadows
    const f = smoothstep(B.decor ? -4.0 : -5.5, -1.6, d);
    let pick = hash01(ccx, ccz, S + 22);
    let row: Row | null = null;
    for (let i = 0; i < B.props.length; i++) {
      pick -= lerp(B.props[i][1], B.props[i][2], f) * (room.kind === 'cache' ? 0.6 : 1);
      if (pick <= 0) {
        row = B.props[i];
        break;
      }
    }
    let small: Row | null = null;
    let meadow = 0;
    if (B.decor && !spec.hub) {
      // small plants gather in meadows rather than evenly, and fill where a tree or rock would not fit
      meadow = smoothstep(-0.2, 0.3, fbm2(ccx * 0.21, ccz * 0.21, 2, S + 40));
      let pick2 = hash01(ccx, ccz, S + 41);
      for (const dr of B.decor) {
        pick2 -= dr[1] * (0.6 + 2.4 * meadow) * (room.kind === 'cache' ? 0.7 : 1);
        if (pick2 <= 0) {
          small = dr[2] >= 0 ? [dr[0], 0, 0, dr[2]] : [dr[0], 0, 0];
          break;
        }
      }
    }
    const big = (): ChunkProp | null => (row ? placeRow(row, false, ccx, ccz, cxw, czw, room) : null);
    const little = (): ChunkProp | null => (small ? placeRow(small, true, ccx, ccz, cxw, czw, room) : null);
    // in a meadow away from the rim, the flowers win the cell
    return meadow > 0.55 && f < 0.5 ? little() || big() : big() || little();
  }

  function placeRow(
    row: Row,
    decor: boolean,
    ccx: number,
    ccz: number,
    cxw: number,
    czw: number,
    room: RoomSpec,
  ): ChunkProp | null {
    const def = getProp(row[0]);
    const sr = def.scale ?? [1, 1];
    const scale = lerp(sr[0], sr[1], hash01(ccx, ccz, S + 23));
    const roomIn = Math.max(0, CELL / 2 - def.reach * scale - 0.04);
    const x = cxw + (hash01(ccx, ccz, S + 24) * 2 - 1) * roomIn;
    const z = czw + (hash01(ccx, ccz, S + 25) * 2 - 1) * roomIn;
    if (decor ? onBridge(x, z, 0.8) : onLink(x, z, 1.6)) return null;
    for (const k of keep) {
      if (decor && k.soft) continue;
      if (Math.hypot(k.x - x, k.z - z) < k.r + def.reach * scale * 0.5 + (def.collide ? 0.8 : 0)) return null;
    }
    if (dist(x, z) > -def.reach * scale * 0.6 - 0.5) return null;
    let pal = row[3];
    if (pal === undefined) {
      const stray = hash01(ccx, ccz, S + 30);
      pal =
        B.leaf[
          Math.floor(
            (stray < 0.25 ? hash01(ccx, ccz, S + 31) : clamp((room.i * 0.37) % 1, 0, 0.999)) * B.leaf.length,
          )
        ];
    }
    return {
      def,
      x,
      y: height(x, z) - 0.06,
      z,
      scale,
      rot: hash01(ccx, ccz, S + 26) * 6.2832,
      seed: hash01(ccx, ccz, S + 28),
      pal,
    };
  }

  function generateChunk(cx: number, cz: number): ChunkData {
    const x0 = cx * N;
    const z0 = cz * N;
    const M = N + 2;
    const hgrid = new Float32Array(M * M);
    const dgrid = new Float32Array(M * M);
    const kgrid = new Uint8Array(M * M);
    let maxH = -1e9;
    for (let j = 0; j < M; j++) {
      for (let i = 0; i < M; i++) {
        const h = height(x0 + i - 1, z0 + j - 1);
        hgrid[j * M + i] = h;
        dgrid[j * M + i] = dist(x0 + i - 1, z0 + j - 1);
        kgrid[j * M + i] = nearLink
          ? 2
          : nearRoom
            ? nearRoom.kind === 'start' || nearRoom.kind === 'exit'
              ? 3
              : 1
            : 0;
        if (h > maxH) maxH = h;
      }
    }

    const chunk: ChunkData = {
      cx,
      cz,
      maxH,
      height: new Float32Array(N * N * 4),
      color: new Uint8Array(N * N * 4),
      mat: new Uint8Array(N * N * 4),
      propsA: new Float32Array(CPC * CPC * 4),
      propsB: new Uint8Array(CPC * CPC * 4),
      props: [],
    };

    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = x0 + i;
        const z = z0 + j;
        const o = (j * N + i) * 4;
        const g = (j + 1) * M + i + 1;
        const h = hgrid[g];
        const d = dgrid[g];
        const kind = kgrid[g];
        const slope = Math.hypot((hgrid[g + 1] - hgrid[g - 1]) / 2, (hgrid[g + M] - hgrid[g - M]) / 2);
        const vary = 0.5 + 0.5 * fbm2(x * 0.045, z * 0.045, 2, S + 30);
        let r = lerp(B.ground[0], B.ground2[0], vary);
        let gg = lerp(B.ground[1], B.ground2[1], vary);
        let b = lerp(B.ground[2], B.ground2[2], vary);
        if (B.ground3) {
          const patch = smoothstep(0.08, 0.42, fbm2(x * 0.026, z * 0.026, 2, S + 50)) * 0.8;
          r = lerp(r, B.ground3[0], patch);
          gg = lerp(gg, B.ground3[1], patch);
          b = lerp(b, B.ground3[2], patch);
        }
        const rock = d > 0 ? smoothstep(0.1, 0.7, d) : smoothstep(0.75, 1.1, slope);
        r = lerp(r, B.rock[0], rock);
        gg = lerp(gg, B.rock[1], rock);
        b = lerp(b, B.rock[2], rock);
        const drift = noise2(x * 0.05, z * 0.05, S + 31);
        const snow = (B.snow || 0) * smoothstep(-0.75, 0.1, drift + 0.4) * (1 - rock);
        r = lerp(r, 0.93, snow);
        gg = lerp(gg, 0.95, snow);
        b = lerp(b, 1.0, snow);
        let path = 0;
        let paved = WALL && d < 0.3 ? 1 : 0;
        if (!WALL) {
          if (kind === 2) paved = 1 - smoothstep(-0.9, -0.5, d);
          else if (kind && d < 0) {
            for (const l of links) {
              const px = x - l.ax;
              const pz = z - l.az;
              const t = px * l.ux + pz * l.uz;
              if (t < -3 || t > l.len + 3) continue;
              const side = Math.abs(px * l.uz - pz * l.ux);
              const reach = Math.min(
                smoothstep(l.t0 - 5.5, l.t0 - 1, t),
                1 - smoothstep(l.t1 + 1, l.t1 + 5.5, t),
              );
              path = Math.max(
                path,
                (1 - smoothstep(0.9, 2.0, side + 0.5 * noise2(x * 0.4, z * 0.4, S + 32))) * reach,
              );
            }
          }
          if (kind === 3) {
            const rm = rooms.find((q) => Math.hypot(x - q.x, z - q.z) < 6);
            if (rm) paved = 1 - smoothstep(3.6, 4.3, Math.hypot(x - rm.x, z - rm.z));
          }
        }
        if (spec.paving && d < -0.4) {
          for (const pv of spec.paving) {
            let pd: number;
            if ('r' in pv) pd = Math.hypot(x - pv.x, z - pv.z) - pv.r;
            else {
              const lx = pv.bx - pv.ax;
              const lz = pv.bz - pv.az;
              const l2 = lx * lx + lz * lz;
              const t = clamp(((x - pv.ax) * lx + (z - pv.az) * lz) / l2, 0, 1);
              pd = Math.hypot(x - pv.ax - lx * t, z - pv.az - lz * t) - pv.w / 2;
            }
            if (pd < 0.6) {
              paved = Math.max(paved, 1 - smoothstep(-0.5, 0.5, pd + 0.35 * noise2(x * 0.5, z * 0.5, S + 33)));
            }
          }
        }
        if (path > 0) {
          r = lerp(r, 0.886, path * 0.9);
          gg = lerp(gg, 0.737, path * 0.9);
          b = lerp(b, 0.51, path * 0.9);
        }
        if (paved > 0) {
          r = lerp(r, 0.9, paved);
          gg = lerp(gg, 0.89, paved);
          b = lerp(b, 0.86, paved);
        }
        path = Math.max(path * 0.5, paved);
        const bare = Math.max(rock, snow, Math.max(path * 2, paved));
        const grass = B.grass * (1 - Math.min(1, bare));
        const sand = B.sand * smoothstep(0.45, 0.7, vary) * (1 - rock) * (1 - Math.min(1, path * 2));
        chunk.height[o] = h;
        const pit = WALL ? pitAt(x, z) : 4;
        chunk.height[o + 2] = WALL ? clamp(pit, -4, 4) : B.flowers * grass;
        chunk.height[o + 3] = WALL ? clamp(pit < 0 ? pitSide : d, -4, 4) : 0;
        chunk.color[o] = r * 255;
        chunk.color[o + 1] = gg * 255;
        chunk.color[o + 2] = b * 255;
        chunk.color[o + 3] = path * 255;
        chunk.mat[o] = grass * 255;
        chunk.mat[o + 1] = sand * 255;
        chunk.mat[o + 2] = snow * 255;
        chunk.mat[o + 3] = rock * 255;
      }
    }

    const gcx = cx * CPC;
    const gcz = cz * CPC;

    const shade = (p: ChunkProp): void => {
      const R = p.def.reach * p.scale * 1.35;
      const strength = Math.min(0.85, 0.3 + p.def.height * 0.12);
      const i0 = Math.max(0, Math.floor(p.x - R - x0));
      const i1 = Math.min(N - 1, Math.ceil(p.x + R - x0));
      const j0 = Math.max(0, Math.floor(p.z - R - z0));
      const j1 = Math.min(N - 1, Math.ceil(p.z + R - z0));
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const v = strength * (1 - smoothstep(0.35 * R, R, Math.hypot(x0 + i - p.x, z0 + j - p.z)));
          const o = (j * N + i) * 4 + 1;
          if (v > chunk.height[o]) chunk.height[o] = v;
        }
      }
    };

    const stamp = (p: ChunkProp, ci: number, cj: number): boolean => {
      const o = (cj * CPC + ci) * 4;
      if (chunk.propsA[o + 3] !== 0) return false;
      chunk.propsA[o] = p.x - (x0 + (ci + 0.5) * CELL);
      chunk.propsA[o + 1] = p.z - (z0 + (cj + 0.5) * CELL);
      chunk.propsA[o + 2] = p.y;
      chunk.propsA[o + 3] = p.def.type;
      chunk.propsB[o] = ((((p.rot / 6.2832) % 1) + 1) % 1) * 255;
      chunk.propsB[o + 1] = clamp(p.scale / 2, 0, 1) * 255;
      chunk.propsB[o + 2] = p.seed * 255;
      chunk.propsB[o + 3] = p.pal;
      return true;
    };

    for (const p of structures) {
      const R = p.def.reach * p.scale;
      if (p.x + R < x0 - 2 || p.x - R > x0 + N + 2 || p.z + R < z0 - 2 || p.z - R > z0 + N + 2) continue;
      if (p.def.height > 1.2) shade(p);
      if (p.x >= x0 && p.x < x0 + N && p.z >= z0 && p.z < z0 + N) chunk.props.push(p);
      for (let cj = 0; cj < CPC; cj++) {
        for (let ci = 0; ci < CPC; ci++) {
          const nx = clamp(p.x, x0 + ci * CELL, x0 + (ci + 1) * CELL);
          const nz = clamp(p.z, z0 + cj * CELL, z0 + (cj + 1) * CELL);
          if (Math.hypot(nx - p.x, nz - p.z) < R && !stamp(p, ci, cj)) {
            console.warn(`${spec.id}: ${p.id} overlaps another fixture in one cell`);
          }
        }
      }
    }

    for (let cj = -1; cj <= CPC; cj++) {
      for (let ci = -1; ci <= CPC; ci++) {
        const p = cellProp(gcx + ci, gcz + cj);
        if (!p) continue;
        shade(p);
        if (ci < 0 || cj < 0 || ci >= CPC || cj >= CPC) continue;
        if (stamp(p, ci, cj)) chunk.props.push(p);
      }
    }

    chunk.maxH += WALL;
    for (const p of chunk.props) {
      if (p.y + p.def.height * p.scale > chunk.maxH) chunk.maxH = p.y + p.def.height * p.scale;
    }
    return chunk;
  }

  return { biome: B, inPit, generateChunk, structures };
}
