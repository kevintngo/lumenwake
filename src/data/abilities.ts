import type { AbilityEffectId, AbilityId, RgbTuple } from '../types/domain';

export interface AbilityDef {
  readonly name: string;
  readonly icon: string;
  readonly cooldown: number;
  readonly focus: number;
  readonly effect: AbilityEffectId;
  readonly desc: string;
  readonly reach?: number;
  readonly radius?: number;
  readonly mult?: number;
  readonly flat?: number;
  readonly scales?: 'attack' | 'power';
  readonly shove?: number;
  readonly speed?: number;
  readonly life?: number;
  readonly splash?: number;
  readonly splashMult?: number;
  readonly shots?: number;
  readonly gap?: number;
  readonly slow?: { readonly factor: number; readonly seconds: number };
  readonly portion?: number;
  readonly seconds?: number;
  readonly invuln?: number;
  readonly color?: RgbTuple;
}

export const ABILITIES: Readonly<Record<AbilityId, AbilityDef>> = {
  cleave: {
    name: 'Cleave',
    icon: 'cleave',
    cooldown: 4,
    focus: 8,
    effect: 'arc',
    reach: 2.9,
    mult: 1.7,
    scales: 'attack',
    color: [0.96, 0.75, 0.24],
    desc: 'A wide cut through everything in front of you.',
  },
  slam: {
    name: 'Ground Slam',
    icon: 'slam',
    cooldown: 9,
    focus: 14,
    effect: 'ring',
    radius: 3.6,
    mult: 2.0,
    scales: 'attack',
    shove: 5,
    color: [0.96, 0.75, 0.24],
    desc: 'Strikes everything round you and throws it back.',
  },
  bolt: {
    name: 'Ember Bolt',
    icon: 'bolt',
    cooldown: 2.6,
    focus: 10,
    effect: 'bolt',
    speed: 17,
    life: 0.85,
    radius: 0.5,
    mult: 0.9,
    flat: 8,
    scales: 'power',
    splash: 1.6,
    splashMult: 0.5,
    color: [0.94, 0.48, 0.2],
    desc: 'A mote of fire that bursts on what it hits.',
  },
  volley: {
    name: 'Volley',
    icon: 'volley',
    cooldown: 5,
    focus: 12,
    effect: 'volley',
    shots: 4,
    gap: 0.09,
    speed: 28,
    life: 0.55,
    radius: 0.35,
    mult: 0.75,
    scales: 'attack',
    color: [0.55, 0.85, 1.0],
    desc: 'Four quick shots at the nearest creatures.',
  },
  nova: {
    name: 'Frost Ring',
    icon: 'nova',
    cooldown: 8,
    focus: 16,
    effect: 'ring',
    radius: 4.4,
    mult: 1.1,
    flat: 6,
    scales: 'power',
    slow: { factor: 0.45, seconds: 3.5 },
    color: [0.55, 0.8, 1.0],
    desc: 'A ring of cold that hurts and slows everything close.',
  },
  mend: {
    name: 'Mend',
    icon: 'mend',
    cooldown: 14,
    focus: 16,
    effect: 'heal',
    portion: 0.34,
    seconds: 3,
    desc: 'Restores a third of your health over a few moments.',
  },
  step: {
    name: 'Gale Step',
    icon: 'step',
    cooldown: 6,
    focus: 8,
    effect: 'dash',
    speed: 26,
    seconds: 0.22,
    invuln: 0.35,
    desc: 'A short dash. Nothing can hurt you while you move.',
  },
};
