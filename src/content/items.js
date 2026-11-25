// Item definitions: pure data. kind: 'coin' (goes straight to the purse),
// 'use' (consumable with an effect id handled in systems/inventory.js),
// 'mat' (sellable material). Gear is not here: see content/gear.js.
// `drop` picks the loot model variant: 0 coins, 1 pouch, 2 flask, 3 gem. `color` is a pencil (0-255).

export const ITEMS = {
  glint: { name: 'Glint', kind: 'coin', drop: 0, color: [244, 190, 62] },

  tonic: { name: 'Red Tonic', kind: 'use', effect: 'heal', power: 0.45, value: 12, price: 26, drop: 2, color: [198, 62, 58], desc: 'Restores 45% of your health.' },
  draught: { name: 'Blue Draught', kind: 'use', effect: 'focus', power: 0.6, value: 14, price: 32, drop: 2, color: [84, 108, 156], desc: 'Restores 60% of your focus.' },

  sprout_leaf: { name: 'Sprout Leaf', kind: 'mat', value: 4, drop: 1, color: [116, 168, 90], desc: 'Still a little wriggly.' },
  puff_spore: { name: 'Puff Spore', kind: 'mat', value: 6, drop: 1, color: [224, 92, 70], desc: 'Do not sneeze near it.' },
  hog_bristle: { name: 'Hog Bristle', kind: 'mat', value: 9, drop: 1, color: [176, 128, 84], desc: 'Stiff as a nail.' },
  wisp_ember: { name: 'Wisp Ember', kind: 'mat', value: 12, drop: 3, color: [136, 180, 216], desc: 'Cool to the touch.' },
  crag_shard: { name: 'Crag Shard', kind: 'mat', value: 18, drop: 3, color: [150, 142, 132], desc: 'Hums when struck.' },
  snap_claw: { name: 'Snap Claw', kind: 'mat', value: 8, drop: 1, color: [226, 176, 52], desc: 'Mind your fingers.' },

  core: { name: 'Survey Core', kind: 'mat', value: 30, drop: 3, color: [136, 180, 216], desc: 'What the survey came down for. The ship pays for these.' },

};

export const SHOP_STOCK = ['tonic', 'draught'];

// What a trader will make from what you carry: the thing, what it takes, and the fee.
export const RECIPES = [
  { id: 'tonic', needs: { sprout_leaf: 3 }, glint: 4 },
  { id: 'draught', needs: { wisp_ember: 2 }, glint: 6 },
];
