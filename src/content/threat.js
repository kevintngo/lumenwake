// How a place answers being surveyed again.
//
// Every place keeps a threat rank on the surveyor's sheet (sheet.threat[biome]).
// A contract won there raises it by one, to THREAT_MAX; being lifted out beaten
// lowers it by one. The rank is what makes a second visit not the first one
// over again: the creatures are a little stronger each time (a row of THREATS),
// and one or more CONDITIONS are in force, drawn by the contract's own dice, so
// two visits at the same rank still differ. The pay and the luck rise with it.
//
// A condition is a row of plain numbers the rules read (sim/systems/missions.js
// folds a contract's rank and conditions into one record with `threatOf`):
//   hp, atk     multiply every creature's health and blows
//   quick       how much faster creatures move and come round to their next blow
//   purse       how much more an island's encounter budget buys (sim/encounters.js)
//   leader      an elder creature leads every pack
//   burst       [reach, seconds, strength]: what a creature leaves where it falls
//   strays      how many kinds of creature from another place are in the mix
//   hour        the hour it is there (a place under an open sky only)
//   aggro       how much farther off creatures notice the hero
//   glint       how much more glint they carry
//   rageAt      the share of its health at which the elder is enraged (0.5 without)
//   only        (offer, biome) => whether the condition can be drawn for this contract

import { biomeById } from './themes.js';

export const THREAT_MAX = 5;

export const THREATS = ['Quiet', 'Stirred', 'Roused', 'Wild', 'Dire', 'Unbound'].map((name, r) => ({
  rank: r, name,
  level: Math.floor(r / 2),         // levels added to every creature
  hp: 1 + 0.14 * r, atk: 1 + 0.07 * r,
  purse: 1 + 0.1 * r,
  pay: 1 + 0.25 * r,                // the contract's experience and glint
  luck: 0.18 * r,                   // how far what drops, and what is paid, leans toward the rarer
  conditions: [0, 1, 1, 2, 2, 3][r],
}));

export const CONDITIONS = {
  swift: { name: 'Swift', text: 'Creatures move and strike a fifth faster.', quick: 1.2 },
  thick: { name: 'Thick-hided', text: 'Creatures have a third more health.', hp: 1.35 },
  packs: { name: 'In numbers', text: 'More creatures on every island.', purse: 1.35 },
  leaders: { name: 'Pack leaders', text: 'An elder creature leads every pack.', leader: true },
  volatile: { name: 'Volatile', text: 'Creatures burst a moment after they fall. Step away.', burst: [2.3, 0.9, 0.8] },
  strays: { name: 'Strays', text: 'Creatures from another place have wandered in.', strays: 3 },
  dark: {
    name: 'After dark', text: 'It is night there. Creatures notice you from farther off, and carry a third more glint.', hour: 23.2, aggro: 1.4, glint: 1.33,
    only: (offer, B) => !B.realm && B.hour > 7 && B.hour < 19.5,
  },
  angry: { name: 'Woken angry', text: 'The elder is enraged from three quarters of its health, not half.', rageAt: 0.75, only: (offer) => offer.goal === 'hunt' },
};

/** The conditions in force on a contract of this rank: distinct, and only ones that can apply to it. rnd: the contract's own dice. */
export function rollConditions(rank, offer, rnd) {
  const B = biomeById(offer.biome), want = THREATS[Math.min(THREAT_MAX, Math.max(0, rank | 0))].conditions;
  const pool = Object.keys(CONDITIONS).filter((id) => !CONDITIONS[id].only || CONDITIONS[id].only(offer, B));
  const out = [];
  while (out.length < want && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}

/** Everything a contract's threat changes, folded into one record: the rank's row with every condition's numbers worked in. */
export function threatOf(offer) {
  const row = THREATS[Math.min(THREAT_MAX, Math.max(0, (offer && offer.threat) | 0))];
  const T = { ...row, quick: 1, aggro: 1, glint: 1, leader: false, burst: null, strays: 0, hour: null, rageAt: 0.5, list: [] };
  for (const id of (offer && offer.conditions) || []) {
    const c = CONDITIONS[id];
    if (!c) continue;
    T.list.push({ id, name: c.name, text: c.text });
    for (const k of ['hp', 'atk', 'purse', 'quick', 'aggro', 'glint']) if (c[k]) T[k] *= c[k];
    if (c.leader) T.leader = true;
    if (c.burst) T.burst = c.burst;
    if (c.strays) T.strays = c.strays;
    if (c.hour) T.hour = c.hour;
    if (c.rageAt) T.rageAt = c.rageAt;
  }
  return T;
}
