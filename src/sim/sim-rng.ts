import { mulberry32 } from '../core/rng';

let stream = mulberry32(1);

export const seedSim = (seed: number): void => {
  stream = mulberry32(seed >>> 0);
};

export const rand = (): number => stream();

export const between = (a: number, b: number): number => a + stream() * (b - a);

export const pick = <T>(list: readonly T[]): T => list[Math.floor(stream() * list.length)];

export function weighted<T>(rows: readonly (readonly [T, number])[]): T {
  let roll = stream() * rows.reduce((n, r) => n + r[1], 0);
  for (const r of rows) {
    roll -= r[1];
    if (roll <= 0) return r[0];
  }
  return rows[rows.length - 1][0];
}
