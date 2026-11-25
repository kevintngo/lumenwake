// Relics: the pieces an elder carries. An ordinary piece of gear only has
// numbers; a relic has a power that changes how its wearer fights. One power to
// a slot, so three relics worn are three choices: which blow, which body, which
// unit. A relic is a row here; what its power does lives in one place,
// sim/systems/relics.js, under the same id.
//
//   slot    the slot the piece fills (a weapon relic is made for the family of the class it drops for)
//   from    the elder that carries it (a creature id in content/creatures.js)
//   text    what it does, as the Gear tab says it
//   the other fields are the power's own numbers, read by sim/systems/relics.js
//
// What each is for, so a new one can be weighed against them: every power is
// worth about a fifth more of what its wearer already does, and only while they
// play to it.
//   quake   packs, and any class's third blow        rot     long fights: an elder, a pack leader
//   chill   holding creatures off; pairs with slows  thorn   standing in the middle of things
//   vigil   one mistake forgiven a contract          meteor  the jump as a blow
//   spore   packs: one death sets off the next       tide    never caught: the step always ready
//   wick    a grown lumen                            rush    keeping moving from kill to kill

export const RELICS = {
  quake: { name: 'Warden’s Weight', slot: 'weapon', from: 'warden', mult: 0.7, radius: 3,
    text: 'The third blow of your chain shakes the ground: 70% of your attack to everything within 3 m of it.' },
  thorn: { name: 'Stoneback', slot: 'frame', from: 'warden', mult: 0.8, reach: 5, every: 1.2, shove: 6,
    text: 'A creature that strikes you from close by is struck back for 80% of your attack and thrown off.' },
  rot: { name: 'Mother’s Bite', slot: 'weapon', from: 'matron', each: 0.18, stacks: 3, seconds: 4,
    text: 'Your blows leave rot: 18% of your attack a second for 4 seconds, up to three deep.' },
  spore: { name: 'Sporecase', slot: 'unit', from: 'matron', mult: 0.9, radius: 2.6,
    text: 'A creature you fell bursts: 90% of your attack to the others within 2.6 m.' },
  chill: { name: 'Brinebite', slot: 'weapon', from: 'sentinel', slow: 0.65, seconds: 2.5, more: 0.2,
    text: 'Your blows slow what they strike by a third, and a slowed creature takes 20% more from you.' },
  tide: { name: 'Tidestep', slot: 'greaves', from: 'sentinel', cooldown: 0.5,
    text: 'Gale Step costs no focus and is ready in half the time.' },
  vigil: { name: 'Last Light', slot: 'frame', from: 'keeper', health: 0.3, seconds: 3,
    text: 'Once a contract, a blow that would fell you leaves you standing at 30% health, untouchable for 3 seconds.' },
  wick: { name: 'Wick', slot: 'mod', from: 'keeper', pace: 0.5, leaps: 2, reach: 6,
    text: 'Your lumen strikes twice as often, and each of its bolts leaps to two more creatures.' },
  meteor: { name: 'Meteor Heel', slot: 'boots', from: 'drifter', mult: 1.6, radius: 3.2, every: 4,
    text: 'Landing from a jump strikes the ground: 160% of your attack within 3.2 m. Ready every 4 seconds.' },
  rush: { name: 'Slipstream', slot: 'unit', from: 'drifter', speed: 0.2, seconds: 3,
    text: 'Felling a creature makes you a fifth faster, on your feet and with your weapon, for 3 seconds.' },
};
for (const id in RELICS) RELICS[id].id = id;

/** The rarity a relic is (a row of RARITIES in content/gear.js that is never rolled by chance). */
export const RELIC_RARITY = 4;

/** The relics an elder carries. */
export const relicsOf = (elder) => Object.values(RELICS).filter((r) => r.from === elder);

/**
 * The chance an elder leaves a relic when it falls: better the more dangerous the place has become
 * (rank: content/threat.js), and better again for every elder since the last that left none (dry).
 */
export const relicChance = (rank, dry) => Math.min(1, 0.18 + 0.14 * (rank || 0) + 0.15 * (dry || 0));
