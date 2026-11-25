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
    // Things only a jump reaches: a side island's bridge may be broken in the middle; a second island
    // beyond it has no bridge at all, only stepping stones; and a big island may have a terrace, a round
    // table of ground a jump high with a supply pod on it.
    let side = 0;
    if (kind === 'fight' && rnd() < 0.72) {
      side = rnd() < 0.5 ? 1 : -1;
      const turn = side * (1.2 + rnd() * 0.7);
      const first = branch(rm, dir + turn, false, rnd() < 0.45);
      if (first && rnd() < 0.5) branch(first, dir + turn * (0.6 + rnd() * 0.5), true, false);
    }
    if (kind === 'fight' && r >= 12 && rnd() < 0.65) {
      const a = dir - (side || (rnd() < 0.5 ? 1 : -1)) * (1.45 + rnd() * 0.4), d = rm.r * 0.52;
      rm.plateau = { x: rm.x + Math.sin(a) * d, z: rm.z + Math.cos(a) * d, r: 3.0, h: 1.2 };
    }
  }
  function branch(from, toward, hop, broken) {
    for (let tries = 0; tries < 12; tries++) {
      const d3 = toward + (rnd() - 0.5) * 0.5;
      const r3 = 8.4 + rnd() * 2.4, dist = from.r + r3 + 7 + rnd() * 5;
      const x = from.x + Math.sin(d3) * dist, z = from.z + Math.cos(d3) * dist;
      if (!fits(rooms, links, from, x, z, r3)) continue;
      const side = room(rooms.length, x, z, r3, Math.min(18, Math.max(6, from.h + (rnd() - 0.5) * (hop ? 1.6 : 3.4))), 'cache', 0.1, rnd);
      rooms.push(side);
      if (!hop) { links.push({ a: from.i, b: side.i, w: 3.6, gate: false, gap: broken ? 2.6 : 0 }); return side; }
      // stepping stones from rim to rim, near enough apart to jump and too far to step
      const s0 = rimAt(from, d3), s1 = dist - rimAt(side, d3 + Math.PI), span = s1 - s0;
      const n = Math.max(1, Math.round(span / 3.9) - 1);
      for (let k = 1; k <= n; k++) {
        const s = s0 + span * k / (n + 1);
        rooms.push(room(rooms.length, from.x + Math.sin(d3) * s, from.z + Math.cos(d3) * s, 1.15, from.h + (side.h - from.h) * k / (n + 1), 'stone', 0, rnd));
      }
      side.hop = true; side.hopFrom = from.i;
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

/**
 * The first contract, "First Light": not rolled but laid out, so a new surveyor meets one thing at a time.
 * A quiet island to learn to fight on (three sproutlings, a supply pod); a bridge with a gap to jump; a
 * second island with a mixed pack, a second wave and a survey mark; and the elder's island.
 */
export function firstSpec(offer) {
  const rnd = mulberry32(offer.seed >>> 0);
  const mk = (i, x, z, r, h, kind, rag, more) => Object.assign(room(i, x, z, r, h, kind, rag, rnd), { main: true, sites: [] }, more);
  const rooms = [
    mk(0, 0, 0, 8.5, 10, 'start', 0.05, {}),
    mk(1, 2, 31, 12.5, 10, 'fight', 0.07, { waves: [['sproutling', 'sproutling', 'sproutling']], pods: 1 }),
    mk(2, 24, 62, 13.5, 11, 'fight', 0.07, { waves: [['puffcap', 'hound', 'hound'], ['mite', 'mite', 'sproutling']], pods: 1, sites: ['mark'] }),
    mk(3, 44, 115, 27, 11, 'boss', 0.05, { waves: [['@matron']] }),
  ];
  const links = [
    { a: 0, b: 1, w: 4.6, gate: true },
    { a: 1, b: 2, w: 4.6, gate: true, gap: 2.2 },          // the first jump
    { a: 2, b: 3, w: 4.6, gate: true },
  ];
  return { id: 'first', biome: offer.biome, seed: offer.seed, rooms, links, start: { x: 0, z: 0, yaw: Math.atan2(rooms[1].x, rooms[1].z) }, offer, laid: true };
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
