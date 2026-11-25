// The lumen's numbers: how much it has eaten, what that makes it, and what it
// lends the hero. Pure functions of the lumen on the hero's sheet
// ({ kind, ember, shell, tide, charge }); the system that moves it and lets its
// burst go is sim/systems/companion.js.

import { LUMENS, LUMEN_STAGES, LUMEN_MAX, LUMEN_STEP } from '../content/companions.js';

export const newLumen = () => ({ kind: 'mote', ember: 0, shell: 0, tide: 0, charge: 0 });
export const lumenTotal = (l) => l.ember + l.shell + l.tide;
export const lumenLevel = (l) => Math.min(LUMEN_MAX, 1 + Math.floor(lumenTotal(l) / LUMEN_STEP));
export const lumenStage = (l) => { const lv = lumenLevel(l); return lv >= LUMEN_STAGES[2] ? 2 : lv >= LUMEN_STAGES[1] ? 1 : 0; };
/** Points still to eat before the next level (0 at the top). */
/** It has eaten all it can. */
export const lumenGrown = (l) => lumenTotal(l) >= (LUMEN_MAX - 1) * LUMEN_STEP;
export const lumenToNext = (l) => (lumenLevel(l) >= LUMEN_MAX ? 0 : LUMEN_STEP - (lumenTotal(l) % LUMEN_STEP));

/** The kind a lumen of these tempers is, at the stage its level has reached. */
export function lumenKind(l) {
  const stage = lumenStage(l), total = lumenTotal(l);
  if (!stage) return 'mote';
  const lead = ['ember', 'shell', 'tide'].reduce((a, b) => (l[b] > l[a] ? b : a));
  const want = stage === 2 && l[lead] < total * 0.45 ? 'even' : lead;        // no temper has near half of it: it grows into the fourth shape
  return Object.keys(LUMENS).find((id) => LUMENS[id].stage === stage && LUMENS[id].temper === want) || 'mote';
}

/** What it lends the hero, as stat modifiers (sim/stats.js). */
export function lumenMods(l) {
  return [
    // (a full-grown lumen fed one thing only lends about a quarter more of it)
    { stat: 'attack', op: 'inc', value: 0.0016 * l.ember },
    { stat: 'defense', op: 'flat', value: 0.1 * l.shell }, { stat: 'maxHp', op: 'inc', value: 0.0012 * l.shell },
    { stat: 'power', op: 'inc', value: 0.0016 * l.tide }, { stat: 'focusRegen', op: 'inc', value: 0.002 * l.tide },
  ];
}
