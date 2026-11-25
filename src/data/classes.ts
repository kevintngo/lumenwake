import type { AbilityId, ClassId, RgbTuple, WeaponFamilyId } from '../types/domain';
import type { AttrMap } from '../types/sheet';

export const SLOT_UNLOCK: readonly number[] = [1, 2, 3, 5];

interface ClassDef {
  readonly name: string;
  readonly family: WeaponFamilyId;
  readonly blurb: string;
  readonly attrs: Readonly<AttrMap>;
  readonly abilities: readonly [AbilityId, AbilityId, AbilityId, AbilityId];
  readonly color: RgbTuple;
}

interface FamilyShotDef {
  readonly speed: number;
  readonly radius: number;
  readonly life: number;
  readonly color: RgbTuple;
  readonly size: number;
  readonly splash?: number;
}

interface WeaponFamilyDef {
  readonly name: string;
  readonly kit: number;
  readonly range: number;
  readonly chain: readonly [number, number, number];
  readonly shot: FamilyShotDef | null;
}

export const CLASSES: Readonly<Record<ClassId, ClassDef>> = {
  vanguard: {
    name: 'Vanguard',
    family: 'blade',
    blurb: 'Up close with an arc blade.',
    attrs: { might: 7, grace: 5, vigor: 7, mind: 3 },
    abilities: ['cleave', 'step', 'slam', 'mend'],
    color: [214, 70, 52],
  },
  ranger: {
    name: 'Ranger',
    family: 'rifle',
    blurb: 'At range with a pulse rifle.',
    attrs: { might: 5, grace: 8, vigor: 5, mind: 4 },
    abilities: ['volley', 'step', 'bolt', 'mend'],
    color: [232, 164, 48],
  },
  adept: {
    name: 'Adept',
    family: 'wand',
    blurb: 'Techniques through a focus rod.',
    attrs: { might: 3, grace: 5, vigor: 5, mind: 9 },
    abilities: ['bolt', 'nova', 'mend', 'step'],
    color: [70, 150, 150],
  },
};

export const FAMILIES: Readonly<Record<WeaponFamilyId, WeaponFamilyDef>> = {
  blade: {
    name: 'Blade',
    kit: 0,
    range: 1.55,
    chain: [1, 1.15, 1.7],
    shot: null,
  },
  rifle: {
    name: 'Rifle',
    kit: 1,
    range: 10.5,
    chain: [1, 1, 1.6],
    shot: { speed: 26, radius: 0.35, life: 0.6, color: [0.55, 0.85, 1.0], size: 0.34 },
  },
  wand: {
    name: 'Rod',
    kit: 2,
    range: 8.5,
    chain: [1, 1.1, 1.5],
    shot: { speed: 15, radius: 0.5, life: 0.8, color: [0.45, 0.95, 0.85], size: 0.5, splash: 1.3 },
  },
};
