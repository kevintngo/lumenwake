// Theme registry. A theme ("biome" in the code the renderer shares with
// Brushwild) is a place's look and life in one row: its ground and stone
// pencils, what grows, what lives there, the hour it is seen at. A zone has
// exactly one, so adding a place to visit is adding a row.
//
// Colours are pencils from the one box the whole game is drawn with (0..1, as
// they sit on cream paper; see gfx/glsl/pencil.js). Muted and earthy: a place
// is full because of how many pencils are in it, never because one is loud.
// The rule borrowed from Valsera's colour script: the hand stays one, the place
// never repeats. So each biome differs from its neighbours in its ground
// pencil, what grows, its stone, and the beasts' coats.
//
//   score(c)   c = { elev, temp, moist, magic, wild, far }; highest score wins
//   props      rows of [propId, chanceInOpenLand, chanceInForest, leafIndex?]; chance is per 4x4 cell.
//              Without a leafIndex a tree takes one of the biome's `leaf` pencils: mostly the one
//              its district favours, so a wood has a colour of its own and a few strays.
//   monsters   rows of [monsterId, weight], read by the spawner
//   variant    how this country's beasts differ: a name and the pencil of their hide

import { smoothstep } from '../core/math.js';

export const BIOMES = [];
const byId = new Map();

export function registerBiome(def) {
  def.index = BIOMES.length;
  def.snow = def.snow || 0;
  def.leaf = def.leaf || [0];
  BIOMES.push(def);
  byId.set(def.id, def);
  return def;
}
export const biomeById = (id) => byId.get(id);

/** Leaf pencils used by trees and bushes; a prop's palette index picks one. (The shader holds 12.) */
export const LEAF_PALETTE = [
  [0.455, 0.659, 0.353],  // 0 leaf
  [0.910, 0.643, 0.188],  // 1 honey (autumn)
  [0.910, 0.588, 0.588],  // 2 blush (blossom)
  [0.330, 0.533, 0.463],  // 3 deep pine
  [0.588, 0.698, 0.471],  // 4 sage
  [0.878, 0.361, 0.275],  // 5 poppy (maple)
  [0.957, 0.804, 0.376],  // 6 butter
  [0.376, 0.620, 0.502],  // 7 sea green
  [0.700, 0.790, 0.470],  // 8 birch light
  [0.530, 0.650, 0.510],  // 9 willow grey-green
  [0.800, 0.520, 0.560],  // 10 heather
  [0.600, 0.730, 0.740],  // 11 frost
];


// ---------------------------------------------------------------- the ship

registerBiome({
  id: 'deck', name: 'Meridian Deck',
  ground: [0.90, 0.89, 0.86], ground2: [0.84, 0.86, 0.90], rock: [0.40, 0.45, 0.60],
  grass: 0, sand: 0, flowers: 0, leaf: [0], rag: 0, roll: 0, paving: 'deck', hour: 10.5, cloud: 0.25,
  props: [], monsters: [], particles: 'pollen',
});

// the town: a kept island. Turf and flowers, glass-leaf trees round the rim, violet stone under it
registerBiome({
  id: 'town', name: 'Meridian Landing',
  ground: [0.420, 0.650, 0.470], ground2: [0.588, 0.698, 0.471], rock: [0.560, 0.520, 0.700],
  grass: 1.0, sand: 0, flowers: 1.0, leaf: [7, 3, 2, 11], rag: 0.05, roll: 0.3, hour: 10.4, cloud: 0.35,
  props: [['tree', 0.03, 0.55], ['bush', 0.03, 0.14, 7], ['bigcap', 0.004, 0.05], ['mushroom', 0.006, 0.03], ['rock', 0.004, 0.02]],
  monsters: [], particles: 'petals',
});

// ---------------------------------------------------------------- places to be sent

// sky islands in full day: sea-green turf on violet stone, glass-leaf trees, blue crystal
registerBiome({
  id: 'glasswood', name: 'Glasswood Terraces', mission: true,
  ground: [0.376, 0.620, 0.502], ground2: [0.588, 0.698, 0.471], rock: [0.560, 0.520, 0.700],
  grass: 1.0, sand: 0, flowers: 0.9, leaf: [7, 3, 2, 11], rag: 0.09, roll: 0.5, hour: 10.2, cloud: 0.4,
  props: [['tree', 0.04, 0.5], ['bigcap', 0.01, 0.1], ['bush', 0.04, 0.12, 7], ['crystal', 0.012, 0.05], ['rock', 0.012, 0.03], ['mushroom', 0.01, 0.04]],
  monsters: [['sproutling', 5], ['wisp', 3], ['bristlehog', 3], ['puffcap', 2], ['cragling', 1]],
  variant: { prefix: 'Glass', pencil: [116, 196, 178] },
  boss: 'matron',
  particles: 'petals',
});

// basalt shelves at sundown: apricot scrub on umber stone, dead trees, amber crystal
registerBiome({
  id: 'ember', name: 'Ember Shelf', mission: true,
  ground: [0.910, 0.700, 0.420], ground2: [0.860, 0.760, 0.460], rock: [0.560, 0.330, 0.270],
  grass: 0.5, sand: 0.35, flowers: 0.2, leaf: [1, 5, 6, 10], rag: 0.11, roll: 0.7, hour: 18.3, cloud: 0.5,
  props: [['deadtree', 0.03, 0.2], ['tree', 0.015, 0.2], ['rock', 0.04, 0.08], ['stone', 0.01, 0.05], ['bush', 0.03, 0.08, 1], ['crystal', 0.008, 0.03], ['cairn', 0.006, 0.02]],
  monsters: [['bristlehog', 5], ['cragling', 3], ['sproutling', 3], ['shellsnap', 3], ['puffcap', 1]],
  variant: { prefix: 'Ember', pencil: [226, 132, 84] },
  boss: 'warden',
  particles: 'embers',
});

// a garden at the edge of night: slate turf, lit caps and crystal, the pools of paper they throw
registerBiome({
  id: 'hush', name: 'The Hush', mission: true,
  ground: [0.400, 0.470, 0.620], ground2: [0.455, 0.612, 0.541], rock: [0.300, 0.330, 0.520],
  grass: 0.7, sand: 0, flowers: 0.5, leaf: [11, 10, 7, 3], rag: 0.1, roll: 0.5, hour: 20.35, cloud: 0.3,
  props: [['bigcap', 0.03, 0.3], ['crystal', 0.03, 0.1], ['willow', 0.01, 0.12], ['mushroom', 0.03, 0.08], ['rock', 0.015, 0.03], ['reeds', 0.01, 0.03]],
  monsters: [['wisp', 5], ['puffcap', 4], ['shellsnap', 3], ['sproutling', 2], ['cragling', 1]],
  variant: { prefix: 'Hush', pencil: [150, 142, 210] },
  boss: 'matron',
  particles: 'fireflies',
});

// terraces under snow in a low morning sun: firs, frost and blue shade
registerBiome({
  id: 'rime', name: 'Rime Steps', mission: true,
  ground: [0.600, 0.730, 0.740], ground2: [0.533, 0.706, 0.847], rock: [0.500, 0.520, 0.600], snow: 0.85,
  grass: 0.2, sand: 0, flowers: 0, leaf: [11, 3, 7], rag: 0.08, roll: 0.9, hour: 8.3, cloud: 0.45,
  props: [['pine', 0.05, 0.5, 3], ['rock', 0.03, 0.05], ['crystal', 0.02, 0.05], ['stump', 0.01, 0.03], ['deadtree', 0.008, 0.03], ['cairn', 0.008, 0.02]],
  monsters: [['cragling', 4], ['wisp', 4], ['bristlehog', 3], ['shellsnap', 2], ['sproutling', 2]],
  variant: { prefix: 'Rime', pencil: [168, 202, 226] },
  boss: 'sentinel',
  particles: 'snow',
});

export const MISSION_BIOMES = BIOMES.filter((b) => b.mission).map((b) => b.id);
