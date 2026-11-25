import { TAU } from '../core/math';
import { mulberry32 } from '../core/rng';
import { biomeById } from '../data/biomes';
import type { TownDef } from '../data/town';
import type { ContractOffer } from '../types/mission';
import type { LinkSpec, RoomKind, RoomSpec, ZoneSpec } from '../types/world';

export function rimAt(room: RoomSpec, angle: number): number {
  if (room.box) {
    const c = Math.abs(Math.cos(angle));
    const s = Math.abs(Math.sin(angle));
    return room.r * 0.9 * Math.pow(c ** 6 + s ** 6, -1 / 6);
  }
  const [p1, p2, p3] = room.w;
  return (
    room.r *
    (1 +
      room.rag *
        (0.5 * Math.sin(3 * angle + p1) +
          0.32 * Math.sin(5 * angle + p2) +
          0.18 * Math.sin(9 * angle + p3)))
  );
}

function makeRoom(
  i: number,
  x: number,
  z: number,
  r: number,
  h: number,
  kind: RoomKind,
  rag: number,
  rnd: () => number,
): RoomSpec {
  return {
    i,
    x,
    z,
    r,
    h,
    kind,
    main: false,
    rag,
    w: [rnd() * TAU, rnd() * TAU, rnd() * TAU],
    waves: [],
    pods: 0,
    sites: [],
  };
}

const mainRooms = (rooms: readonly RoomSpec[]): RoomSpec[] =>
  rooms.filter((r) => r.main || r.kind === 'start');

function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz || 1;
  const t = Math.min(1, Math.max(0, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}

function segSeg(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
  dx: number,
  dz: number,
): boolean {
  const o = (px: number, pz: number, qx: number, qz: number, rx: number, rz: number): number =>
    Math.sign((qx - px) * (rz - pz) - (qz - pz) * (rx - px));
  return (
    o(ax, az, bx, bz, cx, cz) !== o(ax, az, bx, bz, dx, dz) &&
    o(cx, cz, dx, dz, ax, az) !== o(cx, cz, dx, dz, bx, bz)
  );
}

function fits(
  rooms: readonly RoomSpec[],
  links: readonly LinkSpec[],
  from: RoomSpec,
  x: number,
  z: number,
  r: number,
): boolean {
  for (const o of rooms) {
    if (Math.hypot(o.x - x, o.z - z) < o.r + r + 6) return false;
    if (o !== from && segDist(o.x, o.z, from.x, from.z, x, z) < o.r + 4.5) return false;
  }
  for (const l of links) {
    const a = rooms[l.a];
    const b = rooms[l.b];
    if (segDist(x, z, a.x, a.z, b.x, b.z) < r + 4.5) return false;
    if (a !== from && b !== from && segSeg(from.x, from.z, x, z, a.x, a.z, b.x, b.z)) return false;
  }
  return true;
}

export function missionSpec(offer: ContractOffer): ZoneSpec {
  const rnd = mulberry32(offer.seed >>> 0);
  const rooms: RoomSpec[] = [];
  const links: LinkSpec[] = [];
  const B = biomeById(offer.biome);
  const walled = Boolean(B && B.walls);
  const far = (B && B.hop) || 1;
  let h = 10 + Math.floor(rnd() * 3);
  rooms.push(makeRoom(0, 0, 0, 8.5, h, 'start', 0.05, rnd));
  let dir = rnd() * TAU;
  const n = offer.rooms;

  const branch = (from: RoomSpec, toward: number, hop: boolean, broken: boolean): RoomSpec | null => {
    for (let tries = 0; tries < 12; tries++) {
      const d3 = toward + (rnd() - 0.5) * 0.5;
      const r3 = 8.4 + rnd() * 2.4;
      const dist = from.r + r3 + (7 + rnd() * 5) * (hop ? far : 1);
      const x = from.x + Math.sin(d3) * dist;
      const z = from.z + Math.cos(d3) * dist;
      if (!fits(rooms, links, from, x, z, r3)) continue;
      const side = makeRoom(
        rooms.length,
        x,
        z,
        r3,
        Math.min(18, Math.max(6, from.h + (rnd() - 0.5) * (hop ? 1.6 : 3.4))),
        'cache',
        0.1,
        rnd,
      );
      rooms.push(side);
      if (!hop) {
        links.push({ a: from.i, b: side.i, w: 3.6, gate: false, gap: broken ? 2.6 * far : 0 });
        return side;
      }
      const s0 = rimAt(from, d3);
      const s1 = dist - rimAt(side, d3 + Math.PI);
      const span = s1 - s0;
      const count = Math.max(1, Math.round(span / (3.9 * far)) - 1);
      for (let k = 1; k <= count; k++) {
        const s = s0 + (span * k) / (count + 1);
        rooms.push(
          makeRoom(
            rooms.length,
            from.x + Math.sin(d3) * s,
            from.z + Math.cos(d3) * s,
            1.15,
            from.h + ((side.h - from.h) * k) / (count + 1),
            'stone',
            0,
            rnd,
          ),
        );
      }
      return side;
    }
    return null;
  };

  for (let k = 1; k <= n + 1; k++) {
    const last = k === n + 1;
    const kind: RoomKind = last ? (offer.goal === 'hunt' ? 'boss' : 'exit') : 'fight';
    const r = kind === 'boss' ? 27 : kind === 'exit' ? 9 : 11 + rnd() * 4.5;
    const mains = mainRooms(rooms);
    const from = mains[mains.length - 1];
    let placed: { x: number; z: number; d2: number } | null = null;
    for (let tries = 0; tries < 40 && !placed; tries++) {
      const d2 = dir + (rnd() - 0.5) * (tries < 20 ? 1.7 : 3.4);
      const gap = 9 + rnd() * 8;
      const dist = from.r + r + gap;
      const x = from.x + Math.sin(d2) * dist;
      const z = from.z + Math.cos(d2) * dist;
      if (fits(rooms, links, from, x, z, r)) {
        placed = { x, z, d2 };
      }
    }
    if (!placed) break;
    dir = placed.d2;
    const step = rnd() < 0.55 ? 0 : (rnd() < 0.5 ? 1 : -1) * (1.5 + rnd() * 1.5);
    h = Math.min(18, Math.max(6, h + step));
    const rm = makeRoom(
      rooms.length,
      placed.x,
      placed.z,
      r,
      h,
      kind,
      kind === 'exit' || kind === 'boss' ? 0.05 : 0.09,
      rnd,
    );
    rm.main = true;
    rooms.push(rm);
    links.push({ a: from.i, b: rm.i, w: 4.6, gate: true });
    let side = 0;
    if (kind === 'fight' && rnd() < 0.72) {
      side = rnd() < 0.5 ? 1 : -1;
      const turn = side * (1.2 + rnd() * 0.7);
      const first = branch(rm, dir + turn, false, rnd() < (walled ? 0.7 : 0.45));
      if (first && rnd() < 0.5) branch(first, dir + turn * (0.6 + rnd() * 0.5), !walled, walled);
    }
    if (kind === 'fight' && r >= 12 && rnd() < 0.65) {
      const a = dir - (side || (rnd() < 0.5 ? 1 : -1)) * (1.45 + rnd() * 0.4);
      const d = rm.r * 0.52;
      rm.terrace = {
        x: rm.x + Math.sin(a) * d,
        z: rm.z + Math.cos(a) * d,
        r: 3.0,
        h: far > 1.5 ? 2.5 : 1.2,
      };
    }
  }

  rooms[0].main = true;
  if (walled) {
    for (const r of rooms) {
      r.box = true;
      r.rag = 0;
    }
  }

  const fights = rooms.filter((r) => r.kind === 'fight');
  const sides = rooms.filter((r) => r.kind === 'cache');
  for (const r of rooms) r.sites = [];
  const spots = [...sides, ...fights.slice().reverse()];
  for (let k = 0; k < 3 && spots.length; k++) spots[k % spots.length].sites.push('mark');
  if (fights.length) fights[0].sites.push('beacon');
  for (const r of sides) r.sites.push(rnd() < 0.5 ? 'crystal' : 'cargo');
  if (fights.length > 2 && rnd() < 0.5) fights[Math.floor(fights.length / 2)].sites.push('crystal');

  return {
    id: 'm' + offer.seed,
    biome: offer.biome,
    seed: offer.seed,
    rooms,
    links,
    start: { x: 0, z: 0, yaw: rooms[1] ? Math.atan2(rooms[1].x, rooms[1].z) : 0 },
  };
}

export function firstSpec(offer: ContractOffer): ZoneSpec {
  const rnd = mulberry32(offer.seed >>> 0);
  const mk = (
    i: number,
    x: number,
    z: number,
    r: number,
    h: number,
    kind: RoomKind,
    rag: number,
    more: Partial<RoomSpec>,
  ): RoomSpec => Object.assign(makeRoom(i, x, z, r, h, kind, rag, rnd), { main: true, sites: [] }, more);

  const rooms: RoomSpec[] = [
    mk(0, 0, 0, 8.5, 10, 'start', 0.05, {}),
    mk(1, 2, 31, 12.5, 10, 'fight', 0.07, {
      waves: [['sproutling', 'sproutling', 'sproutling']],
      pods: 1,
    }),
    mk(2, 24, 62, 13.5, 11, 'fight', 0.07, {
      waves: [
        ['puffcap', 'hound', 'hound'],
        ['mite', 'mite', 'sproutling'],
      ],
      pods: 1,
      sites: ['mark'],
    }),
    mk(3, 44, 115, 27, 11, 'boss', 0.05, { waves: [['@matron']] }),
  ];

  const links: LinkSpec[] = [
    { a: 0, b: 1, w: 4.6, gate: true },
    { a: 1, b: 2, w: 4.6, gate: true, gap: 2.2 },
    { a: 2, b: 3, w: 4.6, gate: true },
  ];

  return {
    id: 'first',
    biome: offer.biome,
    seed: offer.seed,
    rooms,
    links,
    start: { x: 0, z: 0, yaw: Math.atan2(rooms[1].x, rooms[1].z) },
    laid: true,
  };
}

export function hubSpec(town: TownDef): ZoneSpec {
  const rnd = mulberry32(town.seed);
  const rooms: RoomSpec[] = town.rooms.map(([x, z, r, rag, clear], i) => ({
    ...makeRoom(i, x, z, r, 10, 'town', rag, rnd),
    clear,
  }));
  const links: LinkSpec[] = town.links.map(([a, b, w]) => ({ a, b, w }));
  return {
    id: town.id,
    biome: town.biome,
    seed: town.seed,
    rooms,
    links,
    start: { x: town.start.x, z: town.start.z, yaw: town.start.yaw },
    hub: true,
    fixtures: town.fixtures,
    paving: town.paving,
  };
}
