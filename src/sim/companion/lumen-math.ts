import { LUMENS, LUMEN_MAX, LUMEN_STAGES, LUMEN_STEP } from '../../data/lumens';
import type { LumenId, StatModifier, TemperId } from '../../types/domain';
import type { LumenState } from '../../types/sheet';

const TEMPER_IDS: readonly TemperId[] = ['ember', 'shell', 'tide'];
const LUMEN_IDS = Object.keys(LUMENS) as LumenId[];

export const newLumen = (): LumenState => ({
  kind: 'mote',
  ember: 0,
  shell: 0,
  tide: 0,
  charge: 0,
});

export const lumenTotal = (l: LumenState): number => l.ember + l.shell + l.tide;

export const lumenLevel = (l: LumenState): number =>
  Math.min(LUMEN_MAX, 1 + Math.floor(lumenTotal(l) / LUMEN_STEP));

export const lumenStage = (l: LumenState): number => {
  const lv = lumenLevel(l);
  return lv >= LUMEN_STAGES[2] ? 2 : lv >= LUMEN_STAGES[1] ? 1 : 0;
};

export const lumenGrown = (l: LumenState): boolean =>
  lumenTotal(l) >= (LUMEN_MAX - 1) * LUMEN_STEP;

export const lumenToNext = (l: LumenState): number =>
  lumenLevel(l) >= LUMEN_MAX ? 0 : LUMEN_STEP - (lumenTotal(l) % LUMEN_STEP);

export function lumenKind(l: LumenState): LumenId {
  const stage = lumenStage(l);
  const total = lumenTotal(l);
  if (!stage) return 'mote';
  const lead = TEMPER_IDS.reduce((a, b) => (l[b] > l[a] ? b : a));
  const want: TemperId | 'even' = stage === 2 && l[lead] < total * 0.45 ? 'even' : lead;
  return LUMEN_IDS.find((id) => LUMENS[id].stage === stage && LUMENS[id].temper === want) ?? 'mote';
}

export function lumenMods(l: LumenState): StatModifier[] {
  return [
    { stat: 'attack', op: 'inc', value: 0.0016 * l.ember },
    { stat: 'defense', op: 'flat', value: 0.1 * l.shell },
    { stat: 'maxHp', op: 'inc', value: 0.0012 * l.shell },
    { stat: 'power', op: 'inc', value: 0.0016 * l.tide },
    { stat: 'focusRegen', op: 'inc', value: 0.002 * l.tide },
  ];
}
