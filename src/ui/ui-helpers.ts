import { SLOT_UNLOCK } from '../data/classes';
import { GEAR_SLOTS } from '../data/gear';
import type { EquipSlot, StatKey } from '../types/domain';
import type { GameContext, SkillSlotEntry } from '../types/game-context';
import type { PlayerSheet } from '../types/sheet';

export interface LogSegment {
  text: string;
  className?: string;
  color?: string;
  bold?: boolean;
}

export interface RichSkillEntry extends SkillSlotEntry {
  key: string;
  unlock: number;
}

export const NUMERAL: readonly string[] = ['', 'I', 'II', 'III', 'IV', 'V'];

export const STAT_SHORT: Readonly<Record<StatKey, string>> = {
  might: 'Might',
  grace: 'Grace',
  vigor: 'Vigor',
  mind: 'Mind',
  attack: 'Attack',
  attackSpeed: 'Attack speed',
  crit: 'Crit chance',
  critDamage: 'Crit damage',
  power: 'Technique',
  maxHp: 'Health',
  maxFocus: 'Focus',
  defense: 'Armor',
  hpRegen: 'Health regen',
  focusRegen: 'Focus regen',
  speed: 'Move speed',
  dodge: 'Dodge',
  find: 'Glint found',
  lifeOnKill: 'Life on kill',
};

// public files are served from the build's base: the site root on Vercel, /lumenwake/ on GitHub Pages
export const art = (name: string): string => `${import.meta.env.BASE_URL}art/${name}.webp`;

export const pct = (v: number): string => `${Math.round(v * 100)}%`;

export const formatDuration = (sec: number): string =>
  `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export const formatPlaytime = (sec: number): string => {
  const m = Math.round(sec / 60);
  return m < 60 ? `${Math.max(1, m)} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

const TAG_RE = /<(b|span|em)(?:\s+(class|style)="([^"]*)")?\s*>([\s\S]*?)<\/\1>/gi;
const SAFE_CLASS_RE = /^[a-z0-9\- ]+$/i;
const SAFE_COLOR_RE = /^color:\s*(#[0-9a-f]{3,8}|rgb\([0-9,\s]+\)|var\(--[a-z0-9-]+\))$/i;

export function parseLogText(input: string): LogSegment[] {
  const out: LogSegment[] = [];
  let last = 0;
  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_RE.exec(input)) !== null) {
    if (match.index > last) {
      out.push({ text: input.slice(last, match.index) });
    }
    const tag = match[1].toLowerCase();
    const attrName = match[2]?.toLowerCase();
    const attrVal = match[3] || '';
    const inner = match[4];
    const seg: LogSegment = { text: inner, bold: tag === 'b' };
    if (tag === 'em') {
      seg.className = 'c-name';
    } else if (attrName === 'class' && SAFE_CLASS_RE.test(attrVal)) {
      seg.className = attrVal;
    } else if (attrName === 'style') {
      const col = SAFE_COLOR_RE.exec(attrVal.trim());
      if (col) seg.color = col[1];
    }
    out.push(seg);
    last = match.index + match[0].length;
  }
  if (last < input.length) {
    out.push({ text: input.slice(last) });
  }
  return out;
}

export function highlightNumbers(text: string): LogSegment[] {
  const out: LogSegment[] = [];
  const re = /(\d+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push({ text: text.slice(last, match.index) });
    out.push({ text: match[1], className: 'c-num', bold: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

export function getSkillList(game: GameContext): RichSkillEntry[] {
  return game.skills.list().map((entry, i) => ({
    ...entry,
    key: entry.key ?? String(i + 1),
    unlock: entry.unlock ?? SLOT_UNLOCK[i] ?? 1,
  }));
}

export function findEquippedSlot(sheet: PlayerSheet, uid: number): EquipSlot | null {
  for (const [slot] of GEAR_SLOTS) {
    if (sheet.equip[slot]?.uid === uid) return slot;
  }
  return null;
}
