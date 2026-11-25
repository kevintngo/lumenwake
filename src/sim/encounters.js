// What waits on each island of a contract. An island has a budget, set by the
// contract's tier and how deep into the place it lies; creatures are bought out
// of it from the theme's table until it is spent. So a harder contract is not a
// different list, only a bigger purse, and a new creature needs only a cost.
//
// Fills in room.waves (lists of creature ids; '@id' is a boss) and room.pods.

import { CREATURES } from '../content/creatures.js';

/** spec: a mission layout; theme: its row in content/themes.js; rnd: the contract's own dice. */
export function planEncounters(spec, theme, offer, rnd) {
  const table = theme.monsters;
  const draw = (purse) => {
    const can = table.filter((r) => CREATURES[r[0]].cost <= purse);
    if (!can.length) return null;
    let roll = rnd() * can.reduce((n, r) => n + r[1], 0);
    for (const r of can) { roll -= r[1]; if (roll <= 0) return r[0]; }
    return can[0][0];
  };
  const wave = (purse) => {
    const list = [];
    // mostly one kind, with company: the first pick sets the tone
    const lead = draw(purse);
    for (let id = lead; id && list.length < 6; id = rnd() < 0.6 ? (CREATURES[lead].cost <= purse ? lead : draw(purse)) : draw(purse)) {
      list.push(id);
      purse -= CREATURES[id].cost;
    }
    return list;
  };
  const fights = spec.rooms.filter((r) => r.kind === 'fight');
  for (const r of spec.rooms) {
    r.waves = []; r.pods = 0;
    if (r.kind === 'fight') {
      const depth = fights.indexOf(r) / Math.max(1, fights.length - 1);
      const purse = (2.6 + offer.tier * 0.45) * (0.8 + 0.7 * depth);
      const waves = 1 + (rnd() < 0.3 + 0.35 * depth ? 1 : 0);
      for (let w = 0; w < waves; w++) r.waves.push(wave(purse * (w ? 0.8 : 1)));
      r.pods = rnd() < 0.45 ? 1 : 0;
    } else if (r.kind === 'cache') {
      r.pods = 1;          // (a side island also holds a site: content/sites.js)
      if (rnd() < 0.6) r.waves.push(wave(2.4 + offer.tier * 0.3));
    } else if (r.kind === 'boss') {
      r.waves.push(['@' + theme.boss]);
    }
  }
  // the cores of a recovery are in pods on the way: make sure there are enough
  let need = 0;
  if (offer.goal === 'recover') {
    need = Math.min(3, fights.length);
    for (let k = 0; k < need; k++) { const r = fights[Math.floor((k + 0.5) * fights.length / need)]; r.pods = Math.max(1, r.pods); }
  }
  return need;
}
