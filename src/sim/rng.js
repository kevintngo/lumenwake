// The simulation's dice: one seeded stream. Every rule that rolls (a hit, a
// drop, where a creature wanders) rolls here and nowhere else, so the same seed
// and the same inputs play the same fight. Effects that are only for the eye
// (sparks, drifting petals) use Math.random and never touch this.

import { mulberry32 } from '../core/rng.js';

let stream = mulberry32(1);

/** Start the stream again from a seed (a contract's seed when it begins, a fixed one on the ship). */
export const seedSim = (seed) => { stream = mulberry32(seed >>> 0); };
/** 0 <= x < 1 */
export const rand = () => stream();
export const chance = (p) => stream() < p;
export const between = (a, b) => a + stream() * (b - a);
/** A whole number from a to b, both included. */
export const whole = (a, b) => a + Math.floor(stream() * (b - a + 1));
export const pick = (list) => list[Math.floor(stream() * list.length)];
/** One of `rows` ([thing, weight] pairs) by weight. */
export function weighted(rows) {
  let roll = stream() * rows.reduce((n, r) => n + r[1], 0);
  for (const r of rows) { roll -= r[1]; if (roll <= 0) return r[0]; }
  return rows[rows.length - 1][0];
}
