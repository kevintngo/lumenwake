// Zone generator: turns a layout (rooms and bridges, see layout.js) into the
// chunks the renderer and gameplay read. A zone is islands of turf standing out
// of a sea of cloud, joined by stone bridges; everything that is not room or
// bridge falls away as cliff.
//
// The output of generateChunk() is exactly what the GPU world textures hold,
// plus a prop list for collision and gameplay, so the CPU always agrees with
// what the shader draws.

import { WORLD } from '../config.js';
import { noise2, fbm2, hash01, mulberry32 } from '../core/rng.js';
import { clamp, lerp, smoothstep } from '../core/math.js';
import { biomeById } from '../content/themes.js';
import { propById } from './props.js';   // (also registers every prop's shader)
import { rimAt } from './layout.js';

const N = WORLD.CHUNK, CELL = WORLD.CELL, CPC = N / CELL;
const DEEP = -6;      // the bed under the cloud: far enough down never to show

export function createZone(spec, nav) {
  const S = spec.seed | 0, B = biomeById(spec.biome);
  const rooms = spec.rooms, links = nav.links;
  const deck = B.paving === 'deck';

  // ------------------------------------------------------------ shape
  let nearH = 0, nearLink = null, nearRoom = null;
  /** Signed distance to the floor (negative inside); also notes the floor height there. */
  function dist(x, z) {
    let best = 1e9;
    nearLink = null; nearRoom = null;
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i], dx = x - r.x, dz = z - r.z, d0 = Math.hypot(dx, dz);
      if (d0 - r.r * 1.25 > best) continue;
      const d = d0 - rimAt(r, Math.atan2(dx, dz));
      if (d < best) { best = d; nearH = r.h; nearRoom = r; }
    }
    for (const l of links) {
      const px = x - l.ax, pz = z - l.az;
      const t = clamp(px * l.ux + pz * l.uz, 0, l.len);
      const d = Math.hypot(px - l.ux * t, pz - l.uz * t) - l.w / 2;
      if (d < best) {
        best = d; nearRoom = null; nearLink = l;
        const k = clamp((t - l.t0) / Math.max(0.01, l.t1 - l.t0), 0, 1);
        nearH = l.ha + (l.hb - l.ha) * (k * k * (3 - 2 * k));
      }
    }
    return best;
  }
  function height(x, z) {
    const d = dist(x, z), base = nearH;
    if (d <= 0) {
      if (deck || !nearRoom) return base;
      // turf rolls a little, but never at the rim, on a pad or where a bridge lands
      const flat = nearRoom.kind === 'boss' ? 0.25 : nearRoom.kind === 'start' || nearRoom.kind === 'exit' ? smoothstep(3.5, 6.5, Math.hypot(x - nearRoom.x, z - nearRoom.z)) : 1;
      return base + fbm2(x * 0.07, z * 0.07, 2, S + 7) * B.roll * smoothstep(0, -3, d) * flat * 0.6;
    }
    // the rim crumbles, then the cliff
    const lip = Math.min(d, 0.6) * 0.8;
    const face = Math.max(0, d - 0.6) * (deck ? 30 : 8) + (d > 0.6 && !deck ? 1.6 * noise2(x * 0.35, z * 0.35, S + 9) * Math.min(1, d - 0.6) : 0);
    return Math.max(base - lip - face, DEEP);
  }

  // ------------------------------------------------------------ fixtures
  // What is built: the pads, a gate on every bridge that has one, light posts, supply pods.
  const structures = [];
  const rnd = mulberry32((S ^ 0x5bd1e995) >>> 0);
  const keep = [];      // { x, z, r }: ground nothing else may stand on
  const build = (id, x, z, more = {}) => {
    const def = propById(id);
    const st = { id, def, type: def.type, x, z, y: 0, scale: 1, rot: 0, seed: rnd(), pal: 0, key: id + structures.length, ...more };
    st.y = height(x, z) - 0.04;
    structures.push(st);
    keep.push({ x, z, r: def.reach * st.scale + 0.6 });
    return st;
  };
  for (const r of rooms) {
    if (r.kind === 'start') build('pad', r.x, r.z, { room: r.i, role: 'arrive' });
    if (r.kind === 'exit') build('pad', r.x, r.z, { room: r.i, role: 'leave', pal: 1 });
    keep.push({ x: r.x, z: r.z, r: r.clear ?? (r.kind === 'boss' ? r.r * 0.8 : r.kind === 'cache' ? 2.5 : r.r * 0.3) });        // an elder's island is bare but for its rim
  }
  for (const l of links) {
    const across = Math.atan2(l.uz, -l.ux) + Math.PI / 2;
    if (l.gate) {
      const t = l.t0 + 1.2;
      const g = build('gate', l.ax + l.ux * t, l.az + l.uz * t, { rot: -l.ang, link: l, role: 'gate', scale: l.w / 4.6 });
      l.gateKey = g.key;
    }
    // a lamp where the bridge lands on the far island
    const t = l.t1 + 0.4, s = (l.a + l.b) % 2 ? 1 : -1;
    if (!spec.hub) build('lamp', l.ax + l.ux * t + l.uz * s * (l.w / 2 + 1.1), l.az + l.uz * t - l.ux * s * (l.w / 2 + 1.1));
    void across;
  }
  for (const f of spec.fixtures || []) build(f.id, f.x, f.z, f);
  // supply pods: each room has said how many; they stand off the middle
  for (const r of rooms) {
    for (let k = 0; k < (r.pods || 0); k++) {
      for (let tries = 0; tries < 30; tries++) {
        const a = rnd() * 6.283, d = (r.kind === 'cache' ? 0.15 + rnd() * 0.4 : 0.5 + rnd() * 0.3) * rimAt(r, a);
        const x = r.x + Math.sin(a) * d, z = r.z + Math.cos(a) * d;
        if (keep.some((k2) => Math.hypot(k2.x - x, k2.z - z) < k2.r + 1.6) && r.kind !== 'cache') continue;
        if (structures.some((o) => Math.hypot(o.x - x, o.z - z) < 4.2 + o.def.reach * o.scale)) continue;
        if (onLink(x, z, 2.2)) continue;
        build('pod', x, z, { room: r.i, role: 'pod', rot: rnd() * 6.283 });
        break;
      }
    }
  }
  function onLink(x, z, margin) {
    for (const l of links) {
      const px = x - l.ax, pz = z - l.az, t = px * l.ux + pz * l.uz;
      if (t > -1 && t < l.len + 1 && Math.abs(px * l.uz - pz * l.ux) < l.w / 2 + margin) return true;
    }
    return false;
  }

  // ------------------------------------------------------------ what grows
  function cellProp(ccx, ccz) {
    if (!B.props.length) return null;
    const cxw = (ccx + 0.5) * CELL, czw = (ccz + 0.5) * CELL;
    const d = dist(cxw, czw);
    if (d > -1.4 || !nearRoom) return null;                 // only on islands, in from the rim
    const room = nearRoom;
    // thick at the rim, thin in the middle where the fighting is
    const f = smoothstep(-5.5, -1.6, d);
    let pick = hash01(ccx, ccz, S + 22), row = null;
    for (let i = 0; i < B.props.length; i++) {
      pick -= lerp(B.props[i][1], B.props[i][2], f) * (room.kind === 'cache' ? 0.6 : 1);
      if (pick <= 0) { row = B.props[i]; break; }
    }
    if (!row) return null;
    const def = propById(row[0]);
    const scale = lerp(def.scale[0], def.scale[1], hash01(ccx, ccz, S + 23));
    const roomIn = Math.max(0, CELL / 2 - def.reach * scale - 0.04);
    const x = cxw + (hash01(ccx, ccz, S + 24) * 2 - 1) * roomIn;
    const z = czw + (hash01(ccx, ccz, S + 25) * 2 - 1) * roomIn;
    if (onLink(x, z, 1.6)) return null;
    for (const k of keep) if (Math.hypot(k.x - x, k.z - z) < k.r + def.reach * scale * 0.5 + (def.collide ? 0.8 : 0)) return null;
    if (dist(x, z) > -def.reach * scale * 0.6 - 0.5) return null;
    let pal = row[3];
    if (pal === undefined) {
      const stray = hash01(ccx, ccz, S + 30);
      pal = B.leaf[Math.floor((stray < 0.25 ? hash01(ccx, ccz, S + 31) : clamp((room.i * 0.37) % 1, 0, 0.999)) * B.leaf.length)];
    }
    return { def, type: def.type, x, y: height(x, z) - 0.06, z, scale, rot: hash01(ccx, ccz, S + 26) * 6.2832, seed: hash01(ccx, ccz, S + 28), pal };
  }

  // ------------------------------------------------------------ chunks
  function generateChunk(cx, cz) {
    const x0 = cx * N, z0 = cz * N;
    const M = N + 2;
    const hgrid = new Float32Array(M * M), dgrid = new Float32Array(M * M), kgrid = new Uint8Array(M * M);
    let minH = 1e9, maxH = -1e9;
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
      const h = height(x0 + i - 1, z0 + j - 1);
      hgrid[j * M + i] = h;
      dgrid[j * M + i] = dist(x0 + i - 1, z0 + j - 1);
      kgrid[j * M + i] = nearLink ? 2 : nearRoom ? (nearRoom.kind === 'start' || nearRoom.kind === 'exit' ? 3 : 1) : 0;
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
    }
    const chunk = {
      cx, cz, minH, maxH,
      height: new Float32Array(N * N * 4),   // h, canopy shade, flowers, wetness
      color: new Uint8Array(N * N * 4),      // ground tint rgb, path
      mat: new Uint8Array(N * N * 4),        // grass, sand, snow, rock
      propsA: new Float32Array(CPC * CPC * 4), // offset x, offset z, base y, type
      propsB: new Uint8Array(CPC * CPC * 4),   // rot, scale, seed, palette
      biome: new Uint8Array(N * N).fill(B.index),
      props: [],
    };
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = x0 + i, z = z0 + j, o = (j * N + i) * 4, g = (j + 1) * M + i + 1;
      const h = hgrid[g], d = dgrid[g], kind = kgrid[g];
      const slope = Math.hypot((hgrid[g + 1] - hgrid[g - 1]) / 2, (hgrid[g + M] - hgrid[g - M]) / 2);
      const vary = 0.5 + 0.5 * fbm2(x * 0.045, z * 0.045, 2, S + 30);
      let r = lerp(B.ground[0], B.ground2[0], vary), gg = lerp(B.ground[1], B.ground2[1], vary), b = lerp(B.ground[2], B.ground2[2], vary);
      const rock = d > 0 ? smoothstep(0.1, 0.7, d) : smoothstep(0.75, 1.1, slope);
      r = lerp(r, B.rock[0], rock); gg = lerp(gg, B.rock[1], rock); b = lerp(b, B.rock[2], rock);
      const drift = noise2(x * 0.05, z * 0.05, S + 31);
      const snow = (B.snow || 0) * smoothstep(-0.75, 0.1, drift + 0.4) * (1 - rock);
      r = lerp(r, 0.93, snow); gg = lerp(gg, 0.95, snow); b = lerp(b, 1.0, snow);
      // paths: a bridge is trodden stone, and the trail runs a little way onto each island; a pad sits on paving
      let path = 0, paved = deck && d < 0 ? 1 : 0;
      if (!deck) {
        if (kind === 2) paved = 1 - smoothstep(-0.9, -0.5, d);          // a bridge is decked from curb to curb
        else if (kind && d < 0) {
          for (const l of links) {
            const px = x - l.ax, pz = z - l.az, t = px * l.ux + pz * l.uz;
            if (t < -3 || t > l.len + 3) continue;
            const side = Math.abs(px * l.uz - pz * l.ux);
            const reach = Math.min(smoothstep(l.t0 - 5.5, l.t0 - 1, t), 1 - smoothstep(l.t1 + 1, l.t1 + 5.5, t));
            path = Math.max(path, (1 - smoothstep(0.9, 2.0, side + 0.5 * noise2(x * 0.4, z * 0.4, S + 32))) * reach);
          }
        }
        if (kind === 3) {
          const rm = rooms.find((q) => Math.hypot(x - q.x, z - q.z) < 6);
          if (rm) paved = 1 - smoothstep(3.6, 4.3, Math.hypot(x - rm.x, z - rm.z));
        }
      }
      // plates laid by hand (a town's square and streets)
      if (spec.paving && d < -0.4) for (const pv of spec.paving) {
        let pd;
        if (pv.r) pd = Math.hypot(x - pv.x, z - pv.z) - pv.r;
        else {
          const lx = pv.bx - pv.ax, lz = pv.bz - pv.az, l2 = lx * lx + lz * lz;
          const t = clamp(((x - pv.ax) * lx + (z - pv.az) * lz) / l2, 0, 1);
          pd = Math.hypot(x - pv.ax - lx * t, z - pv.az - lz * t) - pv.w / 2;
        }
        if (pd < 0.6) paved = Math.max(paved, 1 - smoothstep(-0.5, 0.5, pd + 0.35 * noise2(x * 0.5, z * 0.5, S + 33)));
      }
      if (path > 0) { r = lerp(r, 0.886, path * 0.9); gg = lerp(gg, 0.737, path * 0.9); b = lerp(b, 0.51, path * 0.9); }
      if (paved > 0) { r = lerp(r, 0.90, paved); gg = lerp(gg, 0.89, paved); b = lerp(b, 0.86, paved); }
      path = Math.max(path * 0.5, paved);
      const bare = Math.max(rock, snow, Math.max(path * 2, paved));
      const grass = B.grass * (1 - Math.min(1, bare));
      const sand = B.sand * smoothstep(0.45, 0.7, vary) * (1 - rock) * (1 - Math.min(1, path * 2));
      chunk.height[o] = h;
      chunk.height[o + 2] = B.flowers * grass;
      chunk.height[o + 3] = 0;
      chunk.color[o] = r * 255; chunk.color[o + 1] = gg * 255; chunk.color[o + 2] = b * 255; chunk.color[o + 3] = path * 255;
      chunk.mat[o] = grass * 255; chunk.mat[o + 1] = sand * 255; chunk.mat[o + 2] = snow * 255; chunk.mat[o + 3] = rock * 255;
    }
    // props: fixtures first (they may span cells), then what grows; neighbours too, for their shade
    const gcx = cx * CPC, gcz = cz * CPC;
    const shade = (p) => {
      const R = p.def.reach * p.scale * 1.35, strength = Math.min(0.85, 0.3 + p.def.height * 0.12);
      const i0 = Math.max(0, Math.floor(p.x - R - x0)), i1 = Math.min(N - 1, Math.ceil(p.x + R - x0));
      const j0 = Math.max(0, Math.floor(p.z - R - z0)), j1 = Math.min(N - 1, Math.ceil(p.z + R - z0));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const v = strength * (1 - smoothstep(0.35 * R, R, Math.hypot(x0 + i - p.x, z0 + j - p.z)));
        const o = (j * N + i) * 4 + 1;
        if (v > chunk.height[o]) chunk.height[o] = v;
      }
    };
    const stamp = (p, ci, cj) => {
      const o = (cj * CPC + ci) * 4;
      if (chunk.propsA[o + 3] !== 0) return false;
      chunk.propsA[o] = p.x - (x0 + (ci + 0.5) * CELL);
      chunk.propsA[o + 1] = p.z - (z0 + (cj + 0.5) * CELL);
      chunk.propsA[o + 2] = p.y;
      chunk.propsA[o + 3] = p.type;
      chunk.propsB[o] = ((p.rot / 6.2832) % 1 + 1) % 1 * 255;
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
      for (let cj = 0; cj < CPC; cj++) for (let ci = 0; ci < CPC; ci++) {
        const nx = clamp(p.x, x0 + ci * CELL, x0 + (ci + 1) * CELL), nz = clamp(p.z, z0 + cj * CELL, z0 + (cj + 1) * CELL);
        if (Math.hypot(nx - p.x, nz - p.z) < R && !stamp(p, ci, cj)) console.warn(`${spec.id}: ${p.id} overlaps another fixture in one cell`);
      }
    }
    for (let cj = -1; cj <= CPC; cj++) for (let ci = -1; ci <= CPC; ci++) {
      const p = cellProp(gcx + ci, gcz + cj);
      if (!p) continue;
      shade(p);
      if (ci < 0 || cj < 0 || ci >= CPC || cj >= CPC) continue;
      if (stamp(p, ci, cj)) chunk.props.push(p);
    }
    for (const p of chunk.props) if (p.y + p.def.height * p.scale > chunk.maxH) chunk.maxH = p.y + p.def.height * p.scale;
    return chunk;
  }

  return { seed: S, biome: B, height, dist, generateChunk, structures };
}
