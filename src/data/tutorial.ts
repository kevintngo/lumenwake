import type { TutorialChapterId } from '../types/domain';
import type { Entity } from '../types/entity';
import type { GameEventMap } from '../types/events';
import type { GameContext, TutorialLike } from '../types/game-context';

export const CHAPTERS: Readonly<Record<TutorialChapterId, string>> = {
  town: 'Meridian Landing',
  way: 'First Light',
  elder: 'The elder',
  home: 'Home',
};

export interface TutorialStepDef {
  readonly id: string;
  readonly chapter: TutorialChapterId;
  readonly text: string;
  readonly touch?: string;
  readonly keys?: readonly string[];
  readonly point?: string;
  readonly spot?: string | readonly string[];
  readonly touchSpot?: string | readonly string[];
  readonly on?: keyof GameEventMap;
  readonly if?: (payload: unknown, game: GameContext, runner: TutorialLike) => boolean;
  readonly when?: (game: GameContext, runner: TutorialLike) => boolean;
  readonly skip?: (game: GameContext, runner: TutorialLike) => boolean;
  readonly enter?: (game: GameContext, runner: TutorialLike) => void;
  readonly auto?: number;
}

export interface TutorialTipDef {
  readonly id: string;
  readonly keys?: readonly string[];
  readonly text: string;
  readonly touch?: string;
  readonly spot?: string | readonly string[];
  readonly touchSpot?: string | readonly string[];
  readonly seconds: number;
  readonly on?: keyof GameEventMap;
  readonly when?: (game: GameContext, runner: TutorialLike) => boolean;
  readonly until?: keyof GameEventMap;
}

const here = (g: GameContext): number => g.world.roomAt(g.player.x, g.player.z);

const cleared = (g: GameContext, i: number): boolean => {
  const a = g.missions.active;
  return !a || !a.rooms[i] || a.rooms[i].state === 'clear';
};

const close = (g: GameContext): void => g.bus.emit('ui:close');

export const STEPS: readonly TutorialStepDef[] = [
  {
    id: 'walk',
    chapter: 'town',
    keys: ['W', 'A', 'S', 'D'],
    text: 'Walk to Ilse, the dispatcher. Clicking the ground works too.',
    touch: 'Push the stick to walk to Ilse, the dispatcher.',
    point: 'npc:bounty',
    when: (_g, t) => t.near(7),
  },
  {
    id: 'look',
    chapter: 'town',
    keys: ['Right drag'],
    text: 'Hold the right mouse button and drag to look around. The wheel zooms.',
    touch: 'Drag the picture to look around. Pinch to zoom.',
    when: (_g, t) => t.turned(),
    auto: 14,
  },
  {
    id: 'talk',
    chapter: 'town',
    keys: ['F'],
    text: 'Talk to Ilse: click her, or press F beside her.',
    touch: 'Tap Ilse to talk to her.',
    point: 'npc:bounty',
    on: 'npc:talk',
    if: (npc) => (npc as { role?: string } | null)?.role === 'bounty',
  },
  {
    id: 'take',
    chapter: 'town',
    text: 'Take your first contract: First Light.',
    spot: '[data-act="accept"]',
    on: 'mission:taken',
    if: (o) => Boolean(o),
    skip: (g) => Boolean(g.missions.pending),
  },
  {
    id: 'pad',
    chapter: 'town',
    text: 'Go to the pad at the south gate. It sends you down.',
    point: 'pad',
    on: 'mission:begin',
    enter: close,
  },
  {
    id: 'path',
    chapter: 'way',
    text: 'Follow the path onto the first island.',
    point: 'room:1',
    when: (g) => here(g) === 1,
  },
  {
    id: 'attack',
    chapter: 'way',
    keys: ['Click'],
    text: 'Click a creature to attack it. Three hits in a row: the third is the heavy one.',
    touch: 'Tap the sword to attack. Three hits in a row: the third is the heavy one.',
    point: 'foe',
    touchSpot: '.slot.act',
    on: 'monster:died',
    skip: (g) => cleared(g, 1),
  },
  {
    id: 'ability',
    chapter: 'way',
    keys: ['1'],
    text: 'Press 1 for your first ability. It spends focus, the blue bar.',
    touch: 'Tap the first round button: your first ability. It spends focus, the blue bar.',
    point: 'foe',
    spot: '.slot.s0',
    on: 'skill',
  },
  {
    id: 'dodge',
    chapter: 'way',
    text: 'Mustard on the ground means a blow is coming there. Step out of it.',
    point: 'foe',
    when: (g) => cleared(g, 1),
    skip: (g) => cleared(g, 1),
  },
  {
    id: 'loot',
    chapter: 'way',
    text: 'Walk over what they drop to pick it up.',
    point: 'drop',
    when: (g, t) => t.time > 1 && !g.loot.drops.length,
    auto: 20,
  },
  {
    id: 'equip',
    chapter: 'way',
    keys: ['B'],
    text: 'A better weapon. Open your pack and equip it.',
    touch: 'A better weapon. Open the menu and equip it.',
    spot: [
      '.detail [data-act="equip"]:not(:disabled)',
      '.tab-gear .tile[data-key^="gear:"]',
      '#tab-gear',
      '#menu [data-open="bag"]',
    ],
    on: 'equip',
    skip: (g) => !g.player.sheet.gear.length,
  },
  {
    id: 'pod',
    chapter: 'way',
    text: 'Supply pods open when you walk up to them.',
    point: 'pod',
    on: 'pod:open',
    skip: (_g, t) => !t.target('pod'),
  },
  {
    id: 'jump',
    chapter: 'way',
    keys: ['Space'],
    text: 'The gate is down. Jump the gap in the bridge.',
    touch: 'The gate is down. Tap Jump to cross the gap in the bridge.',
    point: 'gap',
    touchSpot: '.slot.jump',
    when: (g) => here(g) === 2,
  },
  {
    id: 'burst',
    chapter: 'way',
    keys: ['G'],
    text: 'Your lumen fills as you fight. It is full now: let its burst go.',
    touch: 'Your lumen fills as you fight. It is full now: tap it.',
    spot: '#lumen',
    on: 'lumen:burst',
    enter: (g) => {
      g.player.sheet.lumen.charge = 100;
    },
    skip: (g) => cleared(g, 2),
  },
  {
    id: 'pack',
    chapter: 'way',
    text: 'Clear the island. A second pack is on its way.',
    point: 'foe',
    when: (g) => cleared(g, 2),
    skip: (g) => cleared(g, 2),
  },
  {
    id: 'mark',
    chapter: 'way',
    text: 'A survey mark. Walk up to it: every mark logged raises the pay.',
    point: 'site:mark',
    on: 'site:used',
    skip: (_g, t) => !t.target('site:mark'),
  },
  {
    id: 'elder',
    chapter: 'elder',
    text: 'The elder holds the last island. Cross to it.',
    point: 'room:boss',
    on: 'boss:arrive',
  },
  {
    id: 'slam',
    chapter: 'elder',
    keys: ['Space'],
    text: 'When the ground under you is marked, get clear, or jump as the blow lands.',
    touch: 'When the ground under you is marked, get clear, or jump as the blow lands.',
    when: (_g, t) => {
      const b = t.target('boss') as Entity | null;
      return t.time > 18 || !b || b.hp < b.maxHp * 0.6;
    },
  },
  {
    id: 'down',
    chapter: 'elder',
    text: 'Bring it down. Keep moving: what it throws lands where you stand.',
    point: 'boss',
    on: 'boss:fell',
    skip: (_g, t) => !t.target('boss'),
  },
  {
    id: 'spoils',
    chapter: 'elder',
    text: 'Pick up what it dropped. You are lifted out when the count ends.',
    point: 'drop',
    on: 'mission:report',
  },
  {
    id: 'paid',
    chapter: 'home',
    text: 'Paid, and a Rare piece on top. Press Continue.',
    spot: '#report-ok',
    on: 'report:closed',
    auto: 30,
  },
  {
    id: 'points',
    chapter: 'home',
    keys: ['C'],
    text: 'You gained levels. Spend your points and choose a talent.',
    touch: 'You gained levels. Open the menu, spend your points and choose a talent.',
    spot: [
      '.char-offer',
      '.attr-grid:has(.plus:not(:disabled))',
      '#tab-character',
      '#menu [data-open="character"]',
    ],
    when: (g) => !g.player.sheet.points && !g.player.sheet.picks,
    skip: (g) => !g.player.sheet.points && !g.player.sheet.picks,
  },
  {
    id: 'feed',
    chapter: 'home',
    keys: ['L'],
    text: 'Feed your lumen what you brought back. At level 5 it changes shape.',
    touch: 'Open the menu and feed your lumen what you brought back. At level 5 it changes shape.',
    spot: [
      '.lumen-feed [data-act="feedall"]',
      '.lumen-feed [data-act="feed"]',
      '#tab-lumen',
      '#menu [data-open="lumen"]',
    ],
    on: 'lumen:changed',
    skip: (g) => g.player.sheet.lumen.kind !== 'mote',
  },
  {
    id: 'next',
    chapter: 'home',
    text: 'That is all of it. Ilse has three new contracts, each in a different place.',
    point: 'npc:bounty',
    on: 'npc:talk',
    auto: 12,
  },
];

export const TIPS: readonly TutorialTipDef[] = [
  {
    id: 'tonic',
    keys: ['R'],
    text: 'Low on health: drink a Red Tonic.',
    touch: 'Low on health: tap the red flask.',
    spot: '.slot.d0',
    seconds: 10,
    when: (g) => !g.player.dead && g.player.hp < g.player.maxHp * 0.45 && g.loot.count('tonic') > 0,
    until: 'drink',
  },
  {
    id: 'fell',
    keys: ['Space'],
    text: 'A missed jump costs a little health. Run at the gap and jump near its edge.',
    touch: 'A missed jump costs a little health. Run at the gap and jump near its edge.',
    seconds: 8,
    on: 'fell',
  },
];
