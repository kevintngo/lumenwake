import type { BoonId, PropId, RgbTuple, SiteId, StatModifier } from '../types/domain';

export interface SiteDef {
  readonly name: string;
  readonly prop: PropId;
  readonly scale: number;
  readonly reach: number;
  readonly color: RgbTuple;
  readonly guard?: boolean;
}

interface BoonDef {
  readonly name: string;
  readonly desc: string;
  readonly mods: readonly StatModifier[];
}

export const SITES: Readonly<Record<SiteId, SiteDef>> = {
  mark: { name: 'Survey mark', prop: 'cairn', scale: 1.35, reach: 2.3, color: [226, 176, 52] },
  beacon: { name: 'Survey beacon', prop: 'console', scale: 1, reach: 2.6, color: [136, 180, 216] },
  crystal: { name: 'Lit crystal', prop: 'crystal', scale: 1.9, reach: 2.6, color: [70, 150, 150] },
  cargo: { name: 'Lost cargo', prop: 'crate', scale: 1.5, reach: 2.4, color: [224, 112, 128], guard: true },
};

export const BOONS: Readonly<Record<BoonId, BoonDef>> = {
  kindled: { name: 'Kindled', desc: 'You hit a fifth harder.', mods: [{ stat: 'attack', op: 'more', value: 0.2 }] },
  fleet: { name: 'Fleet', desc: 'You run a sixth faster.', mods: [{ stat: 'speed', op: 'inc', value: 0.16 }] },
  hale: { name: 'Hale', desc: 'A quarter more health.', mods: [{ stat: 'maxHp', op: 'more', value: 0.25 }] },
  keen: {
    name: 'Keen',
    desc: 'Critical hits come a tenth more often.',
    mods: [{ stat: 'crit', op: 'flat', value: 0.1 }],
  },
};
