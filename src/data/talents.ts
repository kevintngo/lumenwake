import type { AbilityId, TalentId } from '../types/domain';

interface TalentDef {
  readonly name: string;
  readonly max: number;
  readonly desc: string;
  readonly skill?: AbilityId;
}

export const TALENTS: Readonly<Record<TalentId, TalentDef>> = {
  wide: { name: 'Wide Arc', skill: 'cleave', max: 2, desc: 'Cleave reaches a fifth farther.' },
  rend: { name: 'Rending Cut', skill: 'cleave', max: 2, desc: 'Cleave hits a quarter harder.' },
  twin: { name: 'Twin Embers', skill: 'bolt', max: 1, desc: 'Ember Bolt throws two motes, a little apart.' },
  tinder: { name: 'Quick Tinder', skill: 'bolt', max: 2, desc: 'Ember Bolt is ready a fifth sooner.' },
  stride: { name: 'Long Stride', skill: 'step', max: 2, desc: 'Gale Step carries you a quarter farther.' },
  gust: { name: 'Parting Gust', skill: 'step', max: 1, desc: 'Gale Step cuts whatever it passes through.' },
  roots: { name: 'Deep Roots', skill: 'mend', max: 2, desc: 'Mend restores a third more.' },
  hide: { name: 'Thick Hide', max: 3, desc: 'Blows hurt 8% less.' },
  keen: { name: 'Keen Eye', max: 3, desc: 'Six more blows in a hundred are critical.' },
  feet: { name: 'Light Feet', max: 2, desc: 'You run 6% faster.' },
  thrift: { name: 'Thrift', max: 2, desc: 'Skills cost 12% less focus.' },
  forage: { name: 'Forager', max: 2, desc: 'Creatures drop a quarter more glint.' },
  second: { name: 'Second Wind', max: 2, desc: 'A killing blow gives back 5 focus.' },
};
