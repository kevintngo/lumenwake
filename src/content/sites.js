// Things worth the walk: what a contract's islands hold besides creatures and
// supply pods. A site is a landmark (a prop) with a marker turning over it, and
// something happens when the hero walks up to it once its island is quiet.
// Which islands get which is decided when the place is laid out (world/layout.js),
// from the contract's seed; what each does is in sim/systems/sites.js.
//
//   prop    the landmark (world/props.js)      scale   how big it is built
//   reach   how near the hero has to come      color   the marker's pencil (0-255)
//   guard   an elder creature wakes when the hero comes near, and has to be dealt with first

export const SITES = {
  mark: { name: 'Survey mark', prop: 'cairn', scale: 1.35, reach: 2.3, color: [226, 176, 52] },
  beacon: { name: 'Survey beacon', prop: 'console', scale: 1, reach: 2.6, color: [136, 180, 216] },
  crystal: { name: 'Lit crystal', prop: 'crystal', scale: 1.9, reach: 2.6, color: [70, 150, 150] },
  cargo: { name: 'Lost cargo', prop: 'crate', scale: 1.5, reach: 2.4, color: [224, 112, 128], guard: true },
};

/** What a lit crystal lends, until the hero is lifted out. One at a time: a new one replaces the old. */
export const BOONS = {
  kindled: { name: 'Kindled', desc: 'You hit a fifth harder.', mods: [{ stat: 'attack', op: 'more', value: 0.2 }] },
  fleet: { name: 'Fleet', desc: 'You run a sixth faster.', mods: [{ stat: 'speed', op: 'inc', value: 0.16 }] },
  hale: { name: 'Hale', desc: 'A quarter more health.', mods: [{ stat: 'maxHp', op: 'more', value: 0.25 }] },
  keen: { name: 'Keen', desc: 'Critical hits come a tenth more often.', mods: [{ stat: 'crit', op: 'flat', value: 0.1 }] },
};
