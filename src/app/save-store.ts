import { biomeById } from '../data/biomes';
import { CLASSES } from '../data/classes';
import { AFFIXES, BASES, RARITIES, SLOTS_OF } from '../data/gear';
import { ITEMS } from '../data/items';
import { LUMENS } from '../data/lumens';
import { PEOPLES } from '../data/peoples';
import { RELICS, RELIC_RARITY } from '../data/relics';
import { TALENTS } from '../data/talents';
import { THREAT_MAX } from '../data/threat';
import { BAG_GEAR, newPlayerSheet } from '../sim/character/stats';
import { issue } from '../sim/inventory/gear-service';
import type {
  AffixId,
  AttrKey,
  ClassId,
  EquipSlot,
  GearBaseId,
  ItemId,
  LumenId,
  MissionBiomeId,
  PeopleId,
  RelicId,
  TalentId,
} from '../types/domain';
import type { SaveStoreLike } from '../types/game-context';
import type { GearItem, HeroSummary, PlayerSheet, SaveAccount, SaveHero } from '../types/sheet';

const VERSION = 1;
const ACCOUNT = 'lumenwake.v1.account';
const HERO = (id: string) => `lumenwake.v1.hero.${id}`;

const int = (v: unknown, lo: number, hi: number, or = lo): number =>
  Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Math.round(Number(v)))) : or;

const num = (v: unknown, lo: number, hi: number, or = lo): number =>
  Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : or;

const AFFIX_IDS = new Set<string>(AFFIXES.map((a) => a.id));

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function mendPiece(raw: unknown): GearItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const it = raw as Record<string, unknown>;
  const baseKey = it.base as GearBaseId;
  if (!baseKey || !BASES[baseKey]) return null;
  const rawAffixes = Array.isArray(it.affixes) ? it.affixes : [];
  const affixes = rawAffixes
    .filter((a): a is { id: AffixId; value: number } => {
      if (!a || typeof a !== 'object') return false;
      const obj = a as Record<string, unknown>;
      return typeof obj.id === 'string' && AFFIX_IDS.has(obj.id) && Number.isFinite(Number(obj.value));
    })
    .map((a) => ({ id: a.id, value: Number(a.value) }));

  const rawPower = it.power as Record<string, unknown> | null | undefined;
  const powerId = rawPower && typeof rawPower.id === 'string' ? (rawPower.id as TalentId) : null;
  const power =
    rawPower && powerId && TALENTS[powerId]
      ? { id: powerId, ranks: int(rawPower.ranks, 1, 9, 1) }
      : null;

  return {
    uid: int(it.uid, 1, 2 ** 31, 1),
    base: baseKey,
    rarity: int(it.rarity, 0, RARITIES.length - 1),
    ilvl: int(it.ilvl, 1, 999, 1),
    affixes,
    power,
  };
}

function mendItem(raw: unknown): GearItem | null {
  const it = mendPiece(raw);
  if (!it) return null;
  const obj = raw as Record<string, unknown>;
  const relicKey = typeof obj.relic === 'string' ? (obj.relic as RelicId) : null;
  const relic =
    relicKey && RELICS[relicKey] && RELICS[relicKey].slot === BASES[it.base].slot ? relicKey : null;
  if (relic) {
    it.relic = relic;
    it.rarity = RELIC_RARITY;
    it.power = null;
  } else if (it.rarity >= RELIC_RARITY) {
    it.rarity = RELIC_RARITY - 1;
  }
  if (obj.lock) it.lock = true;
  return it;
}

const newId = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function mendHero(raw: unknown): SaveHero | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!obj.sheet || typeof obj.sheet !== 'object') return null;
  const r = obj.sheet as Record<string, unknown>;
  const cls: ClassId = typeof r.cls === 'string' && r.cls in CLASSES ? (r.cls as ClassId) : 'vanguard';
  const family = CLASSES[cls].family;
  const s = newPlayerSheet(cls);
  issue(s);

  s.people = typeof r.people === 'string' && r.people in PEOPLES ? (r.people as PeopleId) : 'unit';
  s.level = int(r.level, 1, 99, 1);
  s.xp = int(r.xp, 0, 1e9, 0);
  s.points = int(r.points, 0, 999, 0);
  s.glint = int(r.glint, 0, 1e9, 0);
  s.picks = int(r.picks, 0, 99, 0);
  s.offer =
    Array.isArray(r.offer) &&
    r.offer.every((id) => typeof id === 'string' && id in TALENTS) &&
    r.offer.length
      ? (r.offer.slice(0, 3) as TalentId[])
      : null;
  if (!s.offer) s.picks = 0;

  s.talents = {};
  const rawTalents = (r.talents && typeof r.talents === 'object' ? r.talents : {}) as Record<string, unknown>;
  for (const id of Object.keys(rawTalents)) {
    const tid = id as TalentId;
    if (TALENTS[tid]) s.talents[tid] = int(rawTalents[id], 0, TALENTS[tid].max || 1, 0);
  }

  const rawBase = (r.base && typeof r.base === 'object' ? r.base : {}) as Record<string, unknown>;
  for (const a of Object.keys(s.base) as AttrKey[]) {
    s.base[a] = int(rawBase[a], 0, 999, s.base[a]);
  }

  s.gear = (Array.isArray(r.gear) ? r.gear : [])
    .map(mendItem)
    .filter((x): x is GearItem => x !== null)
    .slice(0, BAG_GEAR + 10);

  const rawEquip = (r.equip && typeof r.equip === 'object' ? r.equip : {}) as Record<string, unknown>;
  for (const slot of Object.keys(s.equip) as EquipSlot[]) {
    const it = mendItem(rawEquip[slot]);
    if (
      it &&
      SLOTS_OF(BASES[it.base].slot).includes(slot) &&
      (!BASES[it.base].family || BASES[it.base].family === family)
    ) {
      s.equip[slot] = it;
    } else if (rawEquip[slot] === null && slot !== 'weapon') {
      s.equip[slot] = null;
    }
  }

  s.bag = (Array.isArray(r.bag) ? r.bag : [])
    .filter((b): b is { id: ItemId; n: number } => {
      if (!b || typeof b !== 'object') return false;
      const entry = b as Record<string, unknown>;
      return typeof entry.id === 'string' && entry.id in ITEMS && Number(entry.n) > 0;
    })
    .map((b) => ({ id: b.id, n: int(b.n, 1, 9999, 1) }));

  const l = (r.lumen && typeof r.lumen === 'object' ? r.lumen : {}) as Record<string, unknown>;
  s.lumen = {
    kind: typeof l.kind === 'string' && l.kind in LUMENS ? (l.kind as LumenId) : 'mote',
    ember: int(l.ember, 0, 9999, 0),
    shell: int(l.shell, 0, 9999, 0),
    tide: int(l.tide, 0, 9999, 0),
    charge: num(l.charge, 0, 100, 0),
  };

  s.board = int(r.board, 0, 1e9, 0);
  s.missions = int(r.missions, 0, 1e9, 0);
  s.first = Boolean(r.first) && !s.missions;

  const rawThreat = (r.threat && typeof r.threat === 'object' ? r.threat : {}) as Record<string, unknown>;
  for (const id of Object.keys(rawThreat)) {
    const b = biomeById(id);
    if (b && b.mission) s.threat[id as MissionBiomeId] = int(rawThreat[id], 0, THREAT_MAX, 0);
  }

  s.parts = int(r.parts, 0, 1e9, 0);
  s.relicDry = int(r.relicDry, 0, 99, 0);

  const rawRelics = (r.relics && typeof r.relics === 'object' ? r.relics : {}) as Record<string, unknown>;
  for (const id of Object.keys(rawRelics)) {
    const rid = id as RelicId;
    if (RELICS[rid]) s.relics[rid] = int(rawRelics[id], 0, 1e6, 0);
  }

  const id = typeof obj.id === 'string' && /^[a-z0-9]{4,24}$/.test(obj.id) ? obj.id : newId();
  const rawView = obj.view;
  const view: [number, number] | null =
    Array.isArray(rawView) && rawView.length === 2 && rawView.every(Number.isFinite)
      ? [num(rawView[0], 0.2, 1.35, 0.36), num(rawView[1], 7, 42, 10.5)]
      : null;

  const rawPending = obj.pending as Record<string, unknown> | null | undefined;
  const pending =
    rawPending && typeof rawPending === 'object' && Number.isFinite(Number(rawPending.seed))
      ? { seed: Number(rawPending.seed), biome: String(rawPending.biome || '') }
      : null;

  return {
    id,
    version: VERSION,
    name: typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim().slice(0, 24) : 'Surveyor',
    created: int(obj.created, 0, 1e15, Date.now()),
    saved: int(obj.saved, 0, 1e15, Date.now()),
    played: num(obj.played, 0, 1e9, 0),
    view,
    pending,
    sheet: s,
  };
}

function safeLocalStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export class SaveStore implements SaveStoreLike {
  private readonly kv: StorageLike | null;
  failed: boolean;

  constructor(kv: StorageLike | null = safeLocalStorage()) {
    this.kv = kv;
    this.failed = !kv;
  }

  private read(key: string): unknown {
    try {
      const raw = this.kv && this.kv.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: unknown): boolean {
    try {
      if (!this.kv) return false;
      this.kv.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      this.failed = true;
      return false;
    }
  }

  loadAccount(): SaveAccount {
    const a = this.read(ACCOUNT) as Partial<SaveAccount> | null;
    const heroes = (a && Array.isArray(a.heroes) ? a.heroes : []).filter(
      (id): id is string => typeof id === 'string' && Boolean(this.read(HERO(id))),
    );
    return {
      version: VERSION,
      created: a && a.created ? a.created : Date.now(),
      heroes,
    };
  }

  saveAccount(a: SaveAccount): void {
    this.write(ACCOUNT, a);
  }

  newHero(sheet: PlayerSheet, name = 'Surveyor'): SaveHero {
    return {
      id: newId(),
      version: VERSION,
      name,
      created: Date.now(),
      saved: Date.now(),
      played: 0,
      view: null,
      pending: null,
      sheet,
    };
  }

  loadHero(id: string): SaveHero | null {
    return mendHero(this.read(HERO(id)));
  }

  saveHero(h: SaveHero, account: SaveAccount): void {
    this.write(HERO(h.id), h);
    if (account && account.heroes[0] !== h.id) {
      account.heroes = [h.id, ...account.heroes.filter((id) => id !== h.id)];
      this.saveAccount(account);
    }
  }

  deleteHero(id: string, account: SaveAccount): void {
    try {
      if (this.kv) this.kv.removeItem(HERO(id));
    } catch {
    }
    account.heroes = account.heroes.filter((h) => h !== id);
    this.saveAccount(account);
  }

  summaries(account: SaveAccount): HeroSummary[] {
    return account.heroes
      .map((id) => this.loadHero(id))
      .filter((h): h is SaveHero => h !== null)
      .map((h) => ({
        id: h.id,
        cls: h.sheet.cls,
        people: h.sheet.people,
        level: h.sheet.level,
        missions: h.sheet.missions,
        played: h.played,
      }));
  }

  exportAll(account: SaveAccount): string {
    return JSON.stringify(
      {
        lumenwake: VERSION,
        exported: new Date().toISOString(),
        account,
        heroes: account.heroes.map((id) => this.read(HERO(id))).filter(Boolean),
      },
      null,
      1,
    );
  }

  importAll(text: string): boolean {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return false;
    }
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    if (obj.lumenwake !== VERSION || !Array.isArray(obj.heroes)) return false;
    const heroes = obj.heroes.map(mendHero).filter((h): h is SaveHero => h !== null);
    if (!heroes.length) return false;
    for (const id of this.loadAccount().heroes) {
      try {
        if (this.kv) this.kv.removeItem(HERO(id));
      } catch {
      }
    }
    for (const h of heroes) this.write(HERO(h.id), h);
    const acc = obj.account as Partial<SaveAccount> | undefined;
    const order = (acc && Array.isArray(acc.heroes) ? acc.heroes : []).filter((id): id is string =>
      heroes.some((h) => h.id === id),
    );
    this.saveAccount({
      version: VERSION,
      created: Date.now(),
      heroes: [...order, ...heroes.map((h) => h.id).filter((id) => !order.includes(id))],
    });
    return !this.failed;
  }
}
