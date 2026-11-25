// Classes: what a surveyor is built for. A class is a row: where its attributes
// start, which family of weapon it carries, which four abilities sit on its bar
// (ids from abilities.js, in bar order) and the colour it wears. Everything a
// class changes about play follows from these, so adding one is adding a row.

export const SLOT_UNLOCK = [1, 2, 3, 5];      // the level at which each bar slot opens

export const CLASSES = {
  vanguard: {
    name: 'Vanguard', family: 'blade',
    blurb: 'Fights up close with an arc blade. Tough, steady, and hits everything in reach.',
    attrs: { might: 7, grace: 5, vigor: 7, mind: 3 },
    abilities: ['cleave', 'step', 'slam', 'mend'],
    color: [214, 70, 52],
  },
  ranger: {
    name: 'Ranger', family: 'rifle',
    blurb: 'Keeps its distance with a pulse rifle. Quick, precise, hard to pin down.',
    attrs: { might: 5, grace: 8, vigor: 5, mind: 4 },
    abilities: ['volley', 'step', 'bolt', 'mend'],
    color: [232, 164, 48],
  },
  adept: {
    name: 'Adept', family: 'wand',
    blurb: 'Bends light through a focus rod. Frail, but its techniques reach the whole field.',
    attrs: { might: 3, grace: 5, vigor: 5, mind: 9 },
    abilities: ['bolt', 'nova', 'mend', 'step'],
    color: [70, 150, 150],
  },
};

// How each family of weapon fights: how far it reaches, how its three-step chain is weighted
// (the third is the finisher), and what a hit is (a cut in an arc, or a shot that flies).
export const FAMILIES = {
  blade: { name: 'Blade', kit: 0, range: 1.55, chain: [1, 1.15, 1.7], shot: null },
  rifle: { name: 'Rifle', kit: 1, range: 10.5, chain: [1, 1, 1.6], shot: { speed: 26, radius: 0.35, life: 0.6, color: [0.55, 0.85, 1.0], size: 0.34 } },
  wand: { name: 'Rod', kit: 2, range: 8.5, chain: [1, 1.1, 1.5], shot: { speed: 15, radius: 0.5, life: 0.8, color: [0.45, 0.95, 0.85], size: 0.5, splash: 1.3 } },
};
