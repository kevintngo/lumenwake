// The lumen: the small light every surveyor is issued, that rides at the
// shoulder. It is fed what creatures drop, and what it is fed decides what it
// becomes. Three tempers grow with feeding (each food leans its own way); its
// level is how much it has eaten in all; and at two levels along the way it
// takes a new shape, by whichever temper is strongest, or a fourth shape if
// none of them is.
//
// It lends a little to the hero's numbers all the time (sim/lumen.js), puts a
// small bolt into whatever the hero is fighting, and stores up a burst: one
// strong answer, different for each kind, let go with G or a click on its plate.
//
//   stage   0 the mote it starts as, 1 from level 5, 2 from level 12
//   temper  which temper leads to it ('even': none leads)
//   shape   the figure the shader draws (gfx/archetypes/lumen.js)
//   colors  its body, its light, its trim (0-255)
//   burst   what it lets go when it is full: { kind: 'ring' | 'volley' | 'ward' | 'mend' | 'all', ... }

export const TEMPERS = [
  { id: 'ember', name: 'Ember', gives: 'attack', cls: 'c-vanguard' },
  { id: 'shell', name: 'Shell', gives: 'armor and health', cls: 'c-ranger' },
  { id: 'tide', name: 'Tide', gives: 'technique and focus', cls: 'c-adept' },
];

/** What each food adds to the tempers. Anything a creature drops can be fed; flasks can too, for little. */
export const FOODS = {
  wisp_ember: { ember: 3 }, hog_bristle: { ember: 2, shell: 1 }, snap_claw: { ember: 1, shell: 2 },
  crag_shard: { shell: 3 }, sprout_leaf: { tide: 2, shell: 1 }, puff_spore: { tide: 3 },
  tonic: { shell: 1 }, draught: { tide: 1 },
};

export const LUMEN_STAGES = [1, 5, 12];        // the level each stage begins at
export const LUMEN_MAX = 20;
export const LUMEN_STEP = 8;                    // temper points to a level

export const LUMENS = {
  mote: { name: 'Mote', stage: 0, temper: 'any', shape: 0, colors: [[136, 180, 216], [248, 232, 190], [84, 108, 156]],
    blurb: 'Newly lit. Feed it and it grows.', burst: { kind: 'ring', name: 'Spark', r: 3.4, mult: 1.6, text: 'A ring of light hits everything close.' } },
  kindle: { name: 'Kindle', stage: 1, temper: 'ember', shape: 1, colors: [[224, 92, 70], [248, 214, 150], [226, 176, 52]],
    blurb: 'A flame in a shell.', burst: { kind: 'volley', name: 'Shardfall', count: 4, mult: 1.3, text: 'Four shards, each at a creature near you.' } },
  carapace: { name: 'Carapace', stage: 1, temper: 'shell', shape: 2, colors: [[226, 176, 52], [248, 232, 190], [150, 142, 132]],
    blurb: 'Two half shells round a light.', burst: { kind: 'ward', name: 'Shut tight', seconds: 3, text: 'Nothing can hurt you for three seconds.' } },
  ripple: { name: 'Ripple', stage: 1, temper: 'tide', shape: 3, colors: [[70, 150, 150], [214, 240, 236], [136, 180, 216]],
    blurb: 'A ring trailing two ribbons.', burst: { kind: 'mend', name: 'Wash', heal: 0.4, focus: 0.5, text: 'Mends two fifths of your health and half your focus.' } },
  pyre: { name: 'Pyre', stage: 2, temper: 'ember', shape: 4, colors: [[214, 70, 52], [255, 226, 160], [240, 158, 74]],
    blurb: 'A crystal that burns from inside.', burst: { kind: 'ring', name: 'Pyre', r: 6.5, mult: 3.2, text: 'A wide ring of fire hits everything hard.' } },
  bastion: { name: 'Bastion', stage: 2, temper: 'shell', shape: 5, colors: [[232, 164, 48], [255, 240, 200], [122, 62, 44]],
    blurb: 'A plate that turns to face what comes.', burst: { kind: 'ward', name: 'Hold the line', seconds: 5, heal: 0.2, text: 'Five seconds unhurt, and a fifth of your health.' } },
  current: { name: 'Current', stage: 2, temper: 'tide', shape: 6, colors: [[70, 150, 150], [220, 250, 245], [84, 108, 156]],
    blurb: 'Two rings, one inside the other.', burst: { kind: 'mend', name: 'Spring tide', heal: 0.7, focus: 1, text: 'Mends most of your health and all your focus.' } },
  prism: { name: 'Prism', stage: 2, temper: 'even', shape: 7, colors: [[168, 150, 220], [255, 255, 255], [224, 112, 128]],
    blurb: 'A three-sided crystal: no temper leads.', burst: { kind: 'all', name: 'Spectrum', count: 3, mult: 1.2, seconds: 2, heal: 0.25, focus: 0.3, text: 'Three shards, two seconds unhurt, a quarter of your health.' } },
};
