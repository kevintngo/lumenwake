import { h, type JSX } from 'preact';
import type { GearBaseDef } from '../data/gear';
import type { ItemDef } from '../data/items';
import type { AttrKey, RgbTuple, TemperId } from '../types/domain';

type IconNode = JSX.Element;

const css = (c: RgbTuple): string => `rgb(${c.join(',')})`;

const svg = (children: IconNode[], opts?: { cls?: string; strokeWidth?: number; viewBox?: string }): IconNode =>
  h(
    'svg',
    {
      class: opts?.cls,
      viewBox: opts?.viewBox || '0 0 40 40',
      'aria-hidden': 'true',
      fill: 'none',
      stroke: '#dff0ff',
      'stroke-width': opts?.strokeWidth ?? 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    children,
  );

const mini = (children: IconNode[]): IconNode => svg(children, { cls: 'ico', strokeWidth: 3 });

const p = (d: string, attrs?: Record<string, string | number>): IconNode => h('path', { d, ...attrs });
const c = (cx: number, cy: number, r: number, attrs?: Record<string, string | number>): IconNode =>
  h('circle', { cx, cy, r, ...attrs });
const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
  attrs?: Record<string, string | number>,
): IconNode => h('rect', { x, y, width, height, ...attrs });
const ellipse = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  attrs?: Record<string, string | number>,
): IconNode => h('ellipse', { cx, cy, rx, ry, ...attrs });

const HEART = 'M20 34C9 26 5 20 5 13.5a7.5 7.5 0 0 1 15-2.5 7.5 7.5 0 0 1 15 2.5C35 20 31 26 20 34z';
const DROP = 'M20 5c7 9 10.5 14 10.5 19.5a10.5 10.5 0 0 1-21 0C9.5 19 13 14 20 5z';

export const SKILL_ICONS: Readonly<Record<string, () => IconNode>> = {
  slam: () =>
    svg([
      p('M20 5v17', { 'stroke-width': 3.4 }),
      p('M13 16l7 7 7-7', { 'stroke-width': 2.6 }),
      ellipse(20, 30, 14, 4.5, { stroke: '#ffc94a' }),
      p('M6 24l-2-3M34 24l2-3M12 22l-1-4M28 22l1-4', { stroke: '#d64634' }),
    ]),
  volley: () =>
    svg([
      p('M6 13h17M6 20h23M6 27h17', { 'stroke-width': 2.6 }),
      p('M23 9l8 4-8 4zM29 16l8 4-8 4zM23 23l8 4-8 4z', { fill: '#8fd8ff', 'stroke-width': 1.4 }),
    ]),
  nova: () =>
    svg([
      c(20, 20, 13, { stroke: '#8fd8ff', 'stroke-width': 2.6 }),
      c(20, 20, 6, { fill: '#8fd8ff', 'stroke-width': 1.4 }),
      p('M20 3v6M20 31v6M3 20h6M31 20h6M8 8l4 4M28 28l4 4M32 8l-4 4M12 28l-4 4', { 'stroke-width': 1.6 }),
    ]),
  cleave: () =>
    svg([
      p('M6 31C9 15 21 6 35 7 25 12 17 21 15 34z', { fill: '#f1ebdc' }),
      p('M9 25c4-8 10-13 18-15M11 29c3-7 8-11 14-13', { 'stroke-width': 1.4 }),
      p('M27 30l6 4M30 26l5 2', { stroke: '#d64634' }),
    ]),
  bolt: () =>
    svg([
      c(24, 16, 9.5, { fill: '#f09e4a' }),
      p('M24 11c3 1 4 4 3 6s-4 3-6 1 0-5 3-3', { 'stroke-width': 1.5 }),
      p('M5 35l9-9M9 27l5-2M13 35l3-6', { stroke: '#d64634' }),
    ]),
  mend: () =>
    svg([
      p('M20 34C8 25 6 18 9 13c3-5 9-4 11 0 2-4 8-5 11 0 3 5 1 12-11 21z', { fill: '#86c06a' }),
      p('M20 15v10M15 20h10', { stroke: '#f1ebdc', 'stroke-width': 3.2 }),
    ]),
  step: () =>
    svg([
      p('M8 10l11 10L8 30M20 10l11 10-11 10', { stroke: '#546c9c', 'stroke-width': 4.2 }),
      p('M4 16h6M3 24h6', { 'stroke-width': 1.5 }),
    ]),
};

const flask = (col: string): IconNode =>
  svg([
    p('M12.5 24h15l3.5 6a3 3 0 0 1-3 5H12a3 3 0 0 1-3-5z', { fill: col, stroke: 'none' }),
    p('M16 8v7L9 27a5 5 0 0 0 4 8h14a5 5 0 0 0 4-8l-7-12V8'),
    rect(15, 4, 10, 4, { rx: 1.5, fill: '#b08054' }),
    p('M13 24h14', { 'stroke-width': 1.4 }),
  ]);

const pouch = (col: string): IconNode =>
  svg([
    p('M12 14c-6 6-8 20 8 20s14-14 8-20z', { fill: col }),
    p('M13 14c2-3 1-6-1-8h16c-2 2-3 5-1 8z', { fill: '#f1ebdc' }),
    p('M12 14h16', { stroke: '#d64634', 'stroke-width': 2.4 }),
  ]);

const gem = (col: string): IconNode =>
  svg([
    p('M20 4l12 10-12 22L8 14z', { fill: col }),
    p('M8 14h24M20 36V14M20 4l-5 10M20 4l5 10', { 'stroke-width': 1.4 }),
  ]);

export function itemIcon(item: ItemDef): IconNode {
  const col = css(item.color);
  if (item.kind === 'use') return flask(col);
  return item.drop === 3 ? gem(col) : pouch(col);
}

export const GEAR_ICONS: Readonly<Record<string, () => IconNode>> = {
  blade: () =>
    svg([
      p('M15 24L30 6h5v5L18 27z', { fill: '#f1ebdc' }),
      p('M18.5 23.5L31 10', { 'stroke-width': 1.4 }),
      p('M11 20l10 10', { 'stroke-width': 3 }),
      p('M14.5 27.5L9 33', { stroke: '#ff8a70', 'stroke-width': 4 }),
      c(7.5, 34.5, 2, { fill: '#ffc45e' }),
    ]),
  rifle: () =>
    svg([
      p('M4 15h22l3 2v5H17l-1 3h-5l-1-3H4z', { fill: '#88b4d8' }),
      p('M29 19h8', { 'stroke-width': 3 }),
      p('M11 15v-4h10v4', { 'stroke-width': 1.6 }),
      p('M19 25l2 8h-5l-1-8', { fill: '#b08054' }),
      p('M8 18.5h14', { stroke: '#ffc45e', 'stroke-width': 1.6 }),
    ]),
  wand: () =>
    svg([
      p('M9 35L24 17', { 'stroke-width': 3.2 }),
      p('M28 3l7 9-7 9-7-9z', { fill: '#86e6dc' }),
      p('M28 3v18M21 12h14', { 'stroke-width': 1.3 }),
      p('M12 31.5l3 2.6', { stroke: '#ffc45e', 'stroke-width': 2.6 }),
      p('M15 6l1 3M35 24l2 2M12 14l3 1', { 'stroke-width': 1.5 }),
    ]),
  frame: () =>
    svg([
      p('M12 5l8 3 8-3 6 7-5 5v14l-9 4-9-4V17l-5-5z', { fill: '#e2bc82' }),
      p('M20 8v27', { 'stroke-width': 1.4 }),
      p('M11 22h18', { stroke: '#ff8a70', 'stroke-width': 2.4 }),
      p('M14 27h4M22 27h4', { 'stroke-width': 1.4 }),
    ]),
  unit: () =>
    svg([
      p('M20 4l13 7.5v17L20 36 7 28.5v-17z', { fill: '#1c3a80' }),
      c(20, 20, 6.5, { fill: '#fff3c4' }),
      p('M20 4v6M20 30v6M7 11.5l5.5 3M27.5 25.5l5.5 3M33 11.5l-5.5 3M12.5 25.5l-5.5 3', {
        'stroke-width': 1.5,
      }),
    ]),
  offhand: () =>
    svg([
      c(20, 20, 14, { fill: '#88b4d8' }),
      c(20, 20, 9, { 'stroke-width': 1.4 }),
      c(20, 20, 3.5, { fill: '#fff3c4' }),
    ]),
  visor: () =>
    svg([
      p('M6 22c2-9 26-9 28 0v5c-6-3-22-3-28 0z', { fill: '#88b4d8' }),
      p('M10 21c5-3 15-3 20 0', { stroke: '#86e6dc', 'stroke-width': 2.6 }),
    ]),
  grips: () =>
    svg([
      p(
        'M12 34V22l-3-6 3-1 3 5V8a2.5 2.5 0 0 1 5 0v9-11a2.5 2.5 0 0 1 5 0v12-9a2.5 2.5 0 0 1 5 0v15c0 5-3 10-8 10z',
        { fill: '#e2bc82' },
      ),
      p('M12 30h16', { 'stroke-width': 1.6 }),
    ]),
  greaves: () =>
    svg([
      p('M14 6h12l-1 24-5 5-5-5z', { fill: '#88b4d8' }),
      p('M15 14h10M15 22h10', { 'stroke-width': 1.4 }),
    ]),
  boots: () =>
    svg([
      p('M12 5h11v18l9 5v6H9V28l3-4z', { fill: '#e2bc82' }),
      p('M9 30h23M12 12h11', { 'stroke-width': 1.5 }),
    ]),
  mod: () =>
    svg([
      rect(10, 10, 20, 20, { rx: 2, fill: '#1c3a80' }),
      rect(16, 16, 8, 8, { fill: '#86e6dc' }),
      p('M14 6v4M20 6v4M26 6v4M14 30v4M20 30v4M26 30v4', { 'stroke-width': 1.6 }),
    ]),
};

const ELDER_ART: Record<string, string> = {};
const GEAR_ART: Record<string, string> = {};

export function setElderArt(byId: Record<string, string>): void {
  Object.assign(ELDER_ART, byId);
}

export const elderPic = (id: string): string => ELDER_ART[id] || '';

export function setGearArt(byBase: Record<string, string>): void {
  Object.assign(GEAR_ART, byBase);
}

export function gearIcon(base: GearBaseDef): IconNode {
  const src = GEAR_ART[base.id];
  if (src) return h('img', { class: 'gear-art', src, alt: '', draggable: false });
  const fallback = (base.family && GEAR_ICONS[base.family]) || GEAR_ICONS[base.slot] || GEAR_ICONS.unit;
  return fallback();
}

const STAT_ICONS: Readonly<Record<string, () => IconNode>> = {
  attack: () => mini([p('M30 6l4 4-17 17-4-4z', { fill: '#ffab98' }), p('M9 21l10 10M12 28l-6 6')]),
  attackSpeed: () => mini([p('M8 9l11 11L8 31M21 9l11 11-11 11', { stroke: '#ffcc74' })]),
  crit: () =>
    mini([
      c(20, 20, 11),
      c(20, 20, 3.5, { fill: '#ffcc74', stroke: 'none' }),
      p('M20 4v7M20 29v7M4 20h7M29 20h7'),
    ]),
  critDamage: () => mini([p('M20 4l4 11 12 5-12 5-4 11-4-11L4 20l12-5z', { fill: '#ff8a70' })]),
  power: () => mini([p('M22 4L9 22h9l-2 14 13-18h-9z', { fill: '#86e6dc' })]),
  maxHp: () => mini([p(HEART, { fill: '#ff7a66' })]),
  hpRegen: () => mini([p(HEART, { fill: '#ff7a66' }), p('M20 14v10M15 19h10', { stroke: '#fff3ec' })]),
  lifeOnKill: () => mini([p(HEART), p('M14 17l12 8M26 17l-12 8', { stroke: '#ff7a66' })]),
  maxFocus: () => mini([p(DROP, { fill: '#5cc8ff' })]),
  focusRegen: () => mini([p(DROP, { fill: '#5cc8ff' }), p('M20 19v9M15.5 23.5h9', { stroke: '#eef8ff' })]),
  defense: () => mini([p('M20 4l13 4.5v9.5c0 9-5.5 14.5-13 18-7.5-3.5-13-9-13-18V8.5z', { fill: '#a6dbff' })]),
  speed: () => mini([p('M4 13h13M4 20h9M4 27h13', { stroke: '#9ceab4' }), p('M22 9l12 11-12 11z', { fill: '#9ceab4' })]),
  dodge: () =>
    mini([
      p('M9 31C9 16 17 8 32 8', { 'stroke-dasharray': '1 7' }),
      p('M24 4l9 4-5 8', { stroke: '#cdeeff' }),
    ]),
  find: () => mini([p('M20 4l13 16-13 16L7 20z', { fill: '#ffdc6b' })]),
};

export const TOOL_ICONS: Readonly<Record<string, () => IconNode>> = {
  lock: () => mini([rect(8, 18, 24, 17, { rx: 2, fill: '#dff0ff' }), p('M13 18v-5a7 7 0 0 1 14 0v5')]),
  open: () => mini([rect(8, 18, 24, 17, { rx: 2 }), p('M13 18v-5a7 7 0 0 1 13.5-2.5')]),
  parts: () =>
    mini([
      c(20, 20, 6),
      p('M20 4v6M20 30v6M4 20h6M30 20h6M8.5 8.5l4.5 4.5M27 27l4.5 4.5M31.5 8.5L27 13M13 27l-4.5 4.5', {
        stroke: '#b9f0ff',
      }),
    ]),
  hone: () => mini([p('M8 24l12-12 12 12M8 34l12-12 12 12', { stroke: '#ffd772' })]),
  relic: () =>
    mini([
      p('M20 3l11 9-4 21H13L9 12z', { fill: '#e3b0ff' }),
      p('M9 12h22M20 3v30', { stroke: '#5a2f86', 'stroke-width': 2 }),
    ]),
  swap: () => mini([p('M6 14h24l-6-6M34 26H10l6 6')]),
  warn: () => mini([p('M20 5l16 29H4z', { stroke: '#ffb3a3' }), p('M20 16v8M20 29v.5', { stroke: '#ffb3a3' })]),
  lend: () => mini([p('M20 4l4.5 10L35 15.5l-7.5 7.5 2 11L20 28.5 10.5 34l2-11L5 15.5 15.5 14z', { fill: '#ffc45e' })]),
  lift: () => mini([p('M20 33V9M10 18l10-10 10 10', { stroke: '#10214f' }), p('M8 34h24', { stroke: '#10214f' })]),
  deeper: () => mini([p('M20 5v24M10 20l10 10 10-10', { stroke: '#ffc45e' }), p('M6 35h28', { stroke: '#ffc45e', 'stroke-dasharray': '3 4' })]),
  coin: () => mini([c(20, 20, 13, { stroke: '#ffdc6b' }), p('M20 12l6 8-6 8-6-8z', { fill: '#ffdc6b', stroke: '#ffdc6b' })]),
  pack: () => mini([rect(9, 13, 22, 21, { rx: 3 }), p('M15 13v-3a5 5 0 0 1 10 0v3M9 21h22')]),
};

export const ATTR_ICONS: Readonly<Record<AttrKey, (cls?: string) => IconNode>> = {
  might: (cls) =>
    svg(
      [
        p('M10 20h20', { 'stroke-width': 3.4 }),
        rect(9, 11, 5, 18, { rx: 1.5, fill: '#ffab98' }),
        rect(26, 11, 5, 18, { rx: 1.5, fill: '#ffab98' }),
        p('M5 15v10M35 15v10', { 'stroke-width': 3 }),
      ],
      { cls },
    ),
  grace: (cls) =>
    svg(
      [
        p('M32 5C17 7 9 17 8 33c13-2 22-10 24-28z', { fill: '#ffcc74' }),
        p('M8 33L27 11', { 'stroke-width': 1.6 }),
        p('M14 26l-1-7M19 21l-1-7M24 15.5l-1-5M14.5 26.5l7 1M19.5 21.5l6 1', { 'stroke-width': 1.4 }),
      ],
      { cls },
    ),
  vigor: (cls) =>
    svg(
      [
        p('M20 4l13 4.5v9.5c0 9-5.5 14.5-13 18-7.5-3.5-13-9-13-18V8.5z', { fill: '#86c06a' }),
        p('M20 13v12M14 19h12', { stroke: '#f1ebdc', 'stroke-width': 3.4 }),
      ],
      { cls },
    ),
  mind: (cls) =>
    svg(
      [
        p('M20 3l4.5 12.5L37 20l-12.5 4.5L20 37l-4.5-12.5L3 20l12.5-4.5z', { fill: '#86e6dc' }),
        c(20, 20, 3, { fill: '#f1ebdc', 'stroke-width': 1.4 }),
      ],
      { cls },
    ),
};

export function statIcon(stat: string): IconNode | null {
  const fn = STAT_ICONS[stat];
  if (fn) return fn();
  if (stat === 'might' || stat === 'grace' || stat === 'vigor' || stat === 'mind') {
    return ATTR_ICONS[stat]('ico');
  }
  return null;
}

export const TEMPER_ICONS: Readonly<Record<TemperId, () => IconNode>> = {
  ember: () =>
    svg([
      p('M21 3c1 7 9 10 9 19a10 10 0 0 1-20 0c0-4 2-7 4-9 0 4 2 6 4 6-1-6 0-11 3-16z', { fill: '#ff8a70' }),
      p('M20 34a4.5 4.5 0 0 1-4.5-4.5c0-3 2.5-4 4.5-7.5 2 3.5 4.5 4.5 4.5 7.5A4.5 4.5 0 0 1 20 34z', {
        fill: '#ffd772',
        'stroke-width': 1.2,
      }),
    ]),
  shell: () =>
    svg([
      p('M4 28a16 16 0 0 1 32 0z', { fill: '#ffcc74' }),
      p('M20 12v16M11.5 15l4 13M28.5 15l-4 13', { 'stroke-width': 1.5 }),
      p('M3 32h34', { 'stroke-width': 2.6 }),
    ]),
  tide: () =>
    svg([
      p('M3 15c4-5 8-5 11.5 0s7.5 5 11 0 7-4.5 11.5-1', { stroke: '#86e6dc', 'stroke-width': 2.8 }),
      p('M3 24c4-5 8-5 11.5 0s7.5 5 11 0 7-4.5 11.5-1', { 'stroke-width': 2.2 }),
      p('M3 33c4-5 8-5 11.5 0s7.5 5 11 0 7-4.5 11.5-1', { stroke: '#86e6dc', 'stroke-width': 1.8 }),
    ]),
};

export const SET_ICONS: Readonly<Record<string, () => IconNode>> = {
  display: () =>
    svg([
      rect(4, 7, 32, 21, { fill: '#1c3a80' }),
      p('M14 34h12M20 28v6'),
      p('M9 22l6-7 5 5 4-3 7 6', { stroke: '#ffc45e', 'stroke-width': 1.6 }),
    ]),
  sound: () =>
    svg([
      p('M6 16h6l8-7v22l-8-7H6z', { fill: '#88b4d8' }),
      p('M25 14a8 8 0 0 1 0 12M29 10a13 13 0 0 1 0 20'),
    ]),
  controls: () =>
    svg([
      p('M15 5h10v10h10v10H25v10H15V25H5V15h10z', { fill: '#1c3a80' }),
      c(20, 20, 3, { fill: '#ffc45e', 'stroke-width': 1.2 }),
    ]),
  access: () =>
    svg([
      c(20, 20, 16),
      c(20, 11, 2.6, { fill: '#dff0ff', 'stroke-width': 1 }),
      p('M11 16.5h18M20 16.5v8M20 24.5l-5 8M20 24.5l5 8', { 'stroke-width': 2.4 }),
    ]),
  saves: () =>
    svg([
      p('M7 6h21l6 6v22H7z', { fill: '#1c3a80' }),
      p('M12 6v9h13V6', { 'stroke-width': 1.6 }),
      rect(12, 21, 16, 13, { fill: '#f1ebdc', 'stroke-width': 1.4 }),
      p('M15 26h10M15 30h6', { stroke: '#14295f', 'stroke-width': 1.6 }),
    ]),
};

export const MENU_ICONS: Readonly<Record<'gear' | 'contract' | 'guide' | 'menu' | 'character' | 'lumen', () => IconNode>> = {
  gear: GEAR_ICONS.frame,
  contract: () =>
    svg([
      p('M9 4h15l7 7v25H9z', { fill: '#f1ebdc' }),
      p('M24 4v7h7', { 'stroke-width': 1.6 }),
      p('M14 17h12M14 22h12M14 27h6', { stroke: '#14295f', 'stroke-width': 1.8 }),
      c(26, 29, 4, { fill: '#ff8a70', stroke: '#14295f', 'stroke-width': 1.4 }),
    ]),
  guide: () =>
    svg([
      p('M20 9c-4-3-9-3-14-2v24c5-1 10-1 14 2 4-3 9-3 14-2V7c-5-1-10-1-14 2z', { fill: '#1c3a80' }),
      p('M20 9v24', { 'stroke-width': 1.6 }),
      p('M10 14h6M10 19h6M24 14h6M24 19h6', { stroke: '#ffc45e', 'stroke-width': 1.6 }),
    ]),
  menu: () => svg([p('M7 11h26M7 20h26M7 29h26', { 'stroke-width': 3.2 })]),
  character: () =>
    svg([
      c(20, 13, 7, { fill: '#f1ebdc' }),
      p('M7 35c0-9 6-13 13-13s13 4 13 13z', { fill: '#d64634' }),
    ]),
  lumen: () =>
    svg([
      c(20, 20, 5.5, { fill: '#fff3c4' }),
      ellipse(20, 20, 14, 5, { fill: 'none', transform: 'rotate(-24 20 20)' }),
      p('M20 6v4M20 30v4M8 12l3 2.5M29 25.5l3 2.5'),
    ]),
};

export const ACT_ICONS: Readonly<Record<'attack' | 'talk' | 'jump' | 'next', () => IconNode>> = {
  attack: () =>
    svg(
      [
        p('M14 23L29 6h5v5L17 26z', { fill: '#f1ebdc' }),
        p('M17.5 22.5L30 10', { 'stroke-width': 1.4 }),
        p('M10 19l11 11', { 'stroke-width': 3 }),
        p('M13.5 26.5L8 32', { stroke: '#d64634', 'stroke-width': 4 }),
        c(6.5, 33.5, 2, { fill: '#e2b034' }),
      ],
      { cls: 'i-attack' },
    ),
  talk: () =>
    svg(
      [
        p('M6 8h28v18H20l-8 7v-7H6z', { fill: '#f1ebdc' }),
        p('M12 14.5h16M12 20h10', { 'stroke-width': 1.6 }),
      ],
      { cls: 'i-talk' },
    ),
  jump: () =>
    svg([
      p('M20 29V8', { 'stroke-width': 3.6 }),
      p('M11 17l9-9 9 9', { 'stroke-width': 3.6 }),
      p('M9 35h22', { stroke: '#ffc45e', 'stroke-width': 2.8 }),
    ]),
  next: () =>
    svg([
      c(20, 20, 4.5, { fill: '#d64634' }),
      p('M8 17a12.5 12.5 0 0 1 22-6M32 23a12.5 12.5 0 0 1-22 6'),
      p('M31 4v8h-8M9 36v-8h8'),
    ]),
};

export const heartMeterIcon = (): IconNode =>
  h(
    'svg',
    { viewBox: '0 0 16 16', 'aria-hidden': 'true' },
    h('path', {
      d: 'M8 14C3 10 1.5 7.4 2.6 5c1-2.2 4-2.1 5.4.2 1.4-2.3 4.4-2.4 5.4-.2 1.1 2.4-.4 5-5.4 9z',
      fill: '#d8584a',
      stroke: '#623c1e',
      'stroke-width': 1.3,
      'stroke-linejoin': 'round',
    }),
  );

export const dropMeterIcon = (): IconNode =>
  h(
    'svg',
    { viewBox: '0 0 16 16', 'aria-hidden': 'true' },
    h('path', {
      d: 'M8 1.6c2.4 3.2 4.6 5.6 4.6 8.2a4.6 4.6 0 0 1-9.2 0c0-2.6 2.2-5 4.6-8.2z',
      fill: '#4f86b4',
      stroke: '#623c1e',
      'stroke-width': 1.3,
      'stroke-linejoin': 'round',
    }),
  );

export const floorRingSvg = (): IconNode =>
  h(
    'svg',
    { class: 'floor', viewBox: '0 0 200 200', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
    [
      h('ellipse', { class: 'disc', cx: 100, cy: 100, rx: 64, ry: 64 }),
      h('ellipse', { class: 'ring-a', cx: 100, cy: 100, rx: 98, ry: 98 }),
      h('ellipse', { class: 'ring-b', cx: 100, cy: 100, rx: 80, ry: 80 }),
    ],
  );
