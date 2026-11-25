import type { ConditionId, GoalId } from '../types/domain';
import type { ThreatRow } from '../types/mission';
import type { BiomeDef } from '../types/world';

export const THREAT_MAX = 5;

export const THREATS: readonly ThreatRow[] = ['Quiet', 'Stirred', 'Roused', 'Wild', 'Dire', 'Unbound'].map(
  (name, r) => ({
    rank: r,
    name,
    level: Math.floor(r / 2),
    hp: 1 + 0.14 * r,
    atk: 1 + 0.07 * r,
    purse: 1 + 0.1 * r,
    pay: 1 + 0.25 * r,
    luck: 0.18 * r,
    conditions: [0, 1, 1, 2, 2, 3][r],
  }),
);

interface ConditionDef {
  readonly name: string;
  readonly text: string;
  readonly quick?: number;
  readonly hp?: number;
  readonly atk?: number;
  readonly purse?: number;
  readonly leader?: boolean;
  readonly burst?: readonly [number, number, number];
  readonly strays?: number;
  readonly hour?: number;
  readonly aggro?: number;
  readonly glint?: number;
  readonly rageAt?: number;
  readonly only?: (offer: { goal: GoalId }, biome: BiomeDef) => boolean;
}

export const CONDITIONS: Readonly<Record<ConditionId, ConditionDef>> = {
  swift: { name: 'Swift', text: 'Creatures move and strike a fifth faster.', quick: 1.2 },
  thick: { name: 'Thick-hided', text: 'Creatures have a third more health.', hp: 1.35 },
  packs: { name: 'In numbers', text: 'More creatures on every island.', purse: 1.35 },
  leaders: { name: 'Pack leaders', text: 'An elder creature leads every pack.', leader: true },
  volatile: {
    name: 'Volatile',
    text: 'Creatures burst a moment after they fall. Step away.',
    burst: [2.3, 0.9, 0.8],
  },
  strays: { name: 'Strays', text: 'Creatures from another place have wandered in.', strays: 3 },
  dark: {
    name: 'After dark',
    text: 'It is night there. Creatures notice you from farther off, and carry a third more glint.',
    hour: 23.2,
    aggro: 1.4,
    glint: 1.33,
    only: (_offer, biome) => !biome.realm && biome.hour > 7 && biome.hour < 19.5,
  },
  angry: {
    name: 'Woken angry',
    text: 'The elder is enraged from three quarters of its health, not half.',
    rageAt: 0.75,
    only: (offer) => offer.goal === 'hunt',
  },
};
