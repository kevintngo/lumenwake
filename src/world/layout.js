// Where things are, before anything is built: a zone is a handful of round
// rooms (islands, or decks) joined by bridges. The hub is laid out by hand; a
// mission is rolled from its seed, so the same contract is always the same place.
//
//   room  { i, x, z, r, h, kind, rag, w: [phases], waves, pods }
//         kind: 'start' | 'fight' | 'cache' | 'boss' | 'exit' | 'deck'
//   link  { a, b, w, gate }      a bridge from room a to room b, `w` wide; gate: it is shut until room a is cleared

import { mulberry32 } from '../core/rng.js';

const TAU = Math.PI * 2;

/** The rim of a room at an angle: its radius, a little ragged. */
export function rimAt(room, angle) {
  const [p1, p2, p3] = room.w;
  return room.r * (1 + room.rag * (0.5 * Math.sin(3 * angle + p1) + 0.32 * Math.sin(5 * angle + p2) + 0.18 * Math.sin(9 * angle + p3)));
}

function room(i, x, z, r, h, kind, rag, rnd) {
  return { i, x, z, r, h, kind, rag, w: [rnd() * TAU, rnd() * TAU, rnd() * TAU], waves: [], pods: 0 };
}

/** offer: { seed, biome, rooms (how many fights), goal: 'sweep' | 'hunt' | 'recover', tier } */
export function missionSpec(offer) {
  const rnd = mulberry32(offer.seed >>> 0);
  const rooms = [], links = [];
  let h = 10 + Math.floor(rnd() * 3);
  rooms.push(room(0, 0, 0, 8.5, h, 'start', 0.05, rnd));
  let dir = rnd() * TAU;
  const n = offer.rooms;
  for (let k = 1; k <= n + 1; k++) {
    const last = k === n + 1;
    const kind = last ? (offer.goal === 'hunt' ? 'boss' : 'exit') : 'fight';
    const r = kind === 'boss' ? 27 : kind === 'exit' ? 9 : 11 + rnd() * 4.5;        // an elder needs room
    const from = mainRooms(rooms).at(-1);
    let placed = null;
    for (let tries = 0; tries < 40 && !placed; tries++) {
      const d2 = dir + (rnd() - 0.5) * (tries < 20 ? 1.7 : 3.4);
      const gap = 9 + rnd() * 8;
      const dist = from.r + r + gap;
      const x = from.x + Math.sin(d2) * dist, z = from.z + Math.cos(d2) * dist;
      if (fits(rooms, links, from, x, z, r)) { placed = { x, z, d2 }; }
    }
    if (!placed) break;
    dir = placed.d2;
    const step = rnd() < 0.55 ? 0 : (rnd() < 0.5 ? 1 : -1) * (1.5 + rnd() * 1.5);
    h = Math.min(18, Math.max(6, h + step));
    const rm = room(rooms.length, placed.x, placed.z, r, h, kind, kind === 'exit' || kind === 'boss' ? 0.05 : 0.09, rnd);
    rm.main = true;
    rooms.push(rm);
    links.push({ a: from.i, b: rm.i, w: 4.6, gate: true });
    // more often than not a small island off to one side with something worth the detour, and now and
    // then a second one beyond it
    if (kind === 'fight' && rnd() < 0.72) {
      const turn = (rnd() < 0.5 ? 1 : -1) * (1.2 + rnd() * 0.7);
      const side = branch(rm, dir + turn);
      if (side && rnd() < 0.42) branch(side, dir + turn * (0.6 + rnd() * 0.5));
    }
  }
  function branch(from, toward) {
    for (let tries = 0; tries < 12; tries++) {
      const d3 = toward + (rnd() - 0.5) * 0.5;
      const r3 = 8.4 + rnd() * 2.4, dist = from.r + r3 + 7 + rnd() * 5;
      const x = from.x + Math.sin(d3) * dist, z = from.z + Math.cos(d3) * dist;
      if (!fits(rooms, links, from, x, z, r3)) continue;
      const side = room(rooms.length, x, z, r3, Math.min(18, Math.max(6, from.h + (rnd() - 0.5) * 3.4)), 'cache', 0.1, rnd);
      rooms.push(side);
      links.push({ a: from.i, b: side.i, w: 3.6, gate: false });
      return side;
    }
    return null;
  }
  rooms[0].main = true;
  // What there is to find (content/sites.js): three survey marks, on side islands first and then far along
  // the way; a beacon early on; something on every side island; now and then a lit crystal on the way itself.
  const fights = rooms.filter((r) => r.kind === 'fight'), sides = rooms.filter((r) => r.kind === 'cache');
  for (const r of rooms) r.sites = [];
  const spots = [...sides, ...fights.slice().reverse()];
  for (let k = 0; k < 3 && spots.length; k++) spots[k % spots.length].sites.push('mark');
  if (fights.length) fights[0].sites.push('beacon');
  for (const r of sides) r.sites.push(rnd() < 0.5 ? 'crystal' : 'cargo');
  if (fights.length > 2 && rnd() < 0.5) fights[Math.floor(fights.length / 2)].sites.push('crystal');
  return { id: 'm' + offer.seed, biome: offer.biome, seed: offer.seed, rooms, links, start: { x: 0, z: 0, yaw: Math.atan2(rooms[1].x, rooms[1].z) }, offer };
}

const mainRooms = (rooms) => rooms.filter((r) => r.main || r.kind === 'start');

/** Room for a new room at (x, z) with radius r, reached from `from`? */
function fits(rooms, links, from, x, z, r) {
  for (const o of rooms) {
    if (Math.hypot(o.x - x, o.z - z) < o.r + r + 6) return false;
    // the new bridge must not brush past another island
    if (o !== from && segDist(o.x, o.z, from.x, from.z, x, z) < o.r + 4.5) return false;
  }
  // nor may an old bridge pass under the new island
  for (const l of links) {
    const a = rooms[l.a], b = rooms[l.b];
    if (segDist(x, z, a.x, a.z, b.x, b.z) < r + 4.5) return false;
    if (a !== from && b !== from && segSeg(from.x, from.z, x, z, a.x, a.z, b.x, b.z)) return false;
  }
  return true;
}
export function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  const t = Math.min(1, Math.max(0, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
function segSeg(ax, az, bx, bz, cx, cz, dx, dz) {
  const o = (px, pz, qx, qz, rx, rz) => Math.sign((qx - px) * (rz - pz) - (qz - pz) * (rx - px));
  return o(ax, az, bx, bz, cx, cz) !== o(ax, az, bx, bz, dx, dz) && o(cx, cz, dx, dz, ax, az) !== o(cx, cz, dx, dz, bx, bz);
}

/** The town's layout, from its row of data (content/town.js). */
export function hubSpec(town) {
  const rnd = mulberry32(town.seed);
  const rooms = town.rooms.map(([x, z, r, rag, clear], i) => ({ ...room(i, x, z, r, 10, 'town', rag, rnd), clear }));
  const links = town.links.map(([a, b, w]) => ({ a, b, w }));
  return { id: town.id, biome: town.biome, seed: town.seed, rooms, links, start: town.start, hub: true, fixtures: town.fixtures, paving: town.paving };
}
