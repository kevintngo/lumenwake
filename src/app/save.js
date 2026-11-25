// Saves: what a journey keeps between visits. The scheme is Brushwild's.
//
// Everything lives in this browser's storage as small JSON records: an account
// that lists the surveyors (the one played last comes first) and one record for
// each, so a damaged record costs one surveyor and not all of them. A record is
// repaired as it is read (`mendHero`): anything a newer or older version of the
// game left out or would not know is put right, so a save never stops the game
// from starting. A copy of everything can be taken out as a file and put back.
// If the browser will not store anything (a private window, a full disk) the
// game plays on, and `failed` says so.
//
//   account   { version, created, heroes: [id] }
//   hero      { id, version, name, created, saved (ms), played (seconds), view: [pitch, distance] | null,
//               pending: { seed, biome } | null (the contract taken but not yet run), sheet }
//
// What is not kept: a contract in progress. Leave in the middle of one and you are on the ship again
// with everything you had picked up; the contract is still yours to run.

import { CLASSES } from '../content/classes.js';
import { PEOPLES } from '../content/peoples.js';
import { BASES, RARITIES, AFFIXES } from '../content/gear.js';
import { ITEMS } from '../content/items.js';
import { TALENTS } from '../content/talents.js';
import { LUMENS } from '../content/companions.js';
import { biomeById } from '../content/themes.js';
import { THREAT_MAX } from '../content/threat.js';
import { newPlayerSheet, BAG_GEAR } from '../sim/stats.js';
import { issue } from '../sim/items.js';

const VERSION = 1;
const ACCOUNT = 'lumenwake.v1.account';
const HERO = (id) => `lumenwake.v1.hero.${id}`;

const int = (v, lo, hi, or = lo) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, Math.round(+v))) : or);
const num = (v, lo, hi, or = lo) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : or);
const AFFIX_IDS = new Set(AFFIXES.map((a) => a.id));

/** A piece of gear as the game knows gear, or null if it is not one. */
function mendItem(it) {
  if (!it || typeof it !== 'object' || !BASES[it.base]) return null;
  return {
    uid: int(it.uid, 1, 2 ** 31, 1), base: it.base, rarity: int(it.rarity, 0, RARITIES.length - 1), ilvl: int(it.ilvl, 1, 999, 1),
    affixes: (Array.isArray(it.affixes) ? it.affixes : []).filter((a) => a && AFFIX_IDS.has(a.id) && Number.isFinite(+a.value)).map((a) => ({ id: a.id, value: +a.value })),
    power: it.power && TALENTS[it.power.id] ? { id: it.power.id, ranks: int(it.power.ranks, 1, 9, 1) } : null,
  };
}

/** A surveyor's record put right: every field the game reads is there and is something it knows. Null if there is nothing to mend. */
export function mendHero(raw) {
  if (!raw || typeof raw !== 'object' || !raw.sheet || typeof raw.sheet !== 'object') return null;
  const r = raw.sheet, cls = CLASSES[r.cls] ? r.cls : 'vanguard', family = CLASSES[cls].family;
  const s = newPlayerSheet(cls);
  issue(s);                                              // (what the class is issued: kept only where the record has nothing usable)
  s.people = PEOPLES[r.people] ? r.people : 'unit';
  s.level = int(r.level, 1, 99, 1); s.xp = int(r.xp, 0, 1e9, 0); s.points = int(r.points, 0, 999, 0); s.glint = int(r.glint, 0, 1e9, 0);
  s.picks = int(r.picks, 0, 99, 0);
  s.offer = Array.isArray(r.offer) && r.offer.every((id) => TALENTS[id]) && r.offer.length ? r.offer.slice(0, 3) : null;
  if (!s.offer) s.picks = 0;
  s.talents = {};
  for (const id in r.talents || {}) if (TALENTS[id]) s.talents[id] = int(r.talents[id], 0, TALENTS[id].max || 1, 0);
  for (const a in s.base) s.base[a] = int(r.base && r.base[a], 0, 999, s.base[a]);
  s.gear = (Array.isArray(r.gear) ? r.gear : []).map(mendItem).filter(Boolean).slice(0, BAG_GEAR);
  for (const slot of Object.keys(s.equip)) {
    const it = mendItem(r.equip && r.equip[slot]);
    if (it && BASES[it.base].slot === slot && (!BASES[it.base].family || BASES[it.base].family === family)) s.equip[slot] = it;
    else if (r.equip && r.equip[slot] === null && slot !== 'weapon') s.equip[slot] = null;       // (taken off on purpose; a surveyor always has a weapon)
  }
  s.bag = (Array.isArray(r.bag) ? r.bag : []).filter((b) => b && ITEMS[b.id] && +b.n > 0).map((b) => ({ id: b.id, n: int(b.n, 1, 9999, 1) }));
  const l = r.lumen || {};
  s.lumen = { kind: LUMENS[l.kind] ? l.kind : 'mote', ember: int(l.ember, 0, 9999, 0), shell: int(l.shell, 0, 9999, 0), tide: int(l.tide, 0, 9999, 0), charge: num(l.charge, 0, 100, 0) };
  s.board = int(r.board, 0, 1e9, 0); s.missions = int(r.missions, 0, 1e9, 0);
  s.first = !!r.first && !s.missions;
  for (const id in r.threat || {}) if (biomeById(id) && biomeById(id).mission) s.threat[id] = int(r.threat[id], 0, THREAT_MAX, 0);
  const id = typeof raw.id === 'string' && /^[a-z0-9]{4,24}$/.test(raw.id) ? raw.id : newId();
  return {
    id, version: VERSION, name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 24) : 'Surveyor',
    created: int(raw.created, 0, 1e15, Date.now()), saved: int(raw.saved, 0, 1e15, Date.now()), played: num(raw.played, 0, 1e9, 0),
    view: Array.isArray(raw.view) && raw.view.length === 2 && raw.view.every(Number.isFinite) ? [num(raw.view[0], 0.2, 1.35, 0.36), num(raw.view[1], 7, 42, 10.5)] : null,
    pending: raw.pending && Number.isFinite(+raw.pending.seed) ? { seed: +raw.pending.seed, biome: String(raw.pending.biome || '') } : null,
    sheet: s,
  };
}

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
function safeLocalStorage() { try { return globalThis.localStorage ?? null; } catch { return null; } }

export class SaveStore {
  /** kv: anything with getItem / setItem / removeItem (the browser's storage, or a stand-in for a test). */
  constructor(kv = safeLocalStorage()) {
    this.kv = kv;
    this.failed = !kv;        // the browser is not keeping anything
  }
  read(key) { try { const raw = this.kv && this.kv.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } }
  write(key, value) { try { if (!this.kv) return false; this.kv.setItem(key, JSON.stringify(value)); return true; } catch { this.failed = true; return false; } }

  /** The account: made new if there is none, and its list cleared of surveyors whose records have gone. */
  loadAccount() {
    const a = this.read(ACCOUNT);
    const account = { version: VERSION, created: a && a.created ? a.created : Date.now(), heroes: (a && Array.isArray(a.heroes) ? a.heroes : []).filter((id) => typeof id === 'string' && this.read(HERO(id))) };
    return account;
  }
  saveAccount(a) { this.write(ACCOUNT, a); }

  /** A record for a surveyor who has just set out. */
  newHero(sheet, name = 'Surveyor') { return { id: newId(), version: VERSION, name, created: Date.now(), saved: Date.now(), played: 0, view: null, pending: null, sheet }; }
  loadHero(id) { return mendHero(this.read(HERO(id))); }
  /** Keeps a surveyor, and puts them first in the account. */
  saveHero(h, account) {
    this.write(HERO(h.id), h);
    if (account && account.heroes[0] !== h.id) {
      account.heroes = [h.id, ...account.heroes.filter((id) => id !== h.id)];
      this.saveAccount(account);
    }
  }
  deleteHero(id, account) {
    try { if (this.kv) this.kv.removeItem(HERO(id)); } catch { /* it was not there */ }
    account.heroes = account.heroes.filter((h) => h !== id);
    this.saveAccount(account);
  }

  /** One line about each surveyor, for the screen that lists them. */
  summaries(account) {
    return account.heroes.map((id) => this.loadHero(id)).filter(Boolean)
      .map((h) => ({ id: h.id, name: h.name, cls: h.sheet.cls, people: h.sheet.people, level: h.sheet.level, missions: h.sheet.missions, lumen: h.sheet.lumen.kind, played: h.played, saved: h.saved }));
  }

  /** Everything, as text to keep in a file. */
  exportAll(account) {
    return JSON.stringify({ lumenwake: VERSION, exported: new Date().toISOString(), account, heroes: account.heroes.map((id) => this.read(HERO(id))).filter(Boolean) }, null, 1);
  }
  /** Puts back what `exportAll` wrote, in place of whatever is here. False if the text is not that. */
  importAll(text) {
    let data;
    try { data = JSON.parse(text); } catch { return false; }
    if (!data || data.lumenwake !== VERSION || !Array.isArray(data.heroes)) return false;
    const heroes = data.heroes.map(mendHero).filter(Boolean);
    if (!heroes.length) return false;
    for (const id of this.loadAccount().heroes) { try { this.kv.removeItem(HERO(id)); } catch { /* gone already */ } }
    for (const h of heroes) this.write(HERO(h.id), h);
    const order = (data.account && Array.isArray(data.account.heroes) ? data.account.heroes : []).filter((id) => heroes.some((h) => h.id === id));
    this.saveAccount({ version: VERSION, created: Date.now(), heroes: [...order, ...heroes.map((h) => h.id).filter((id) => !order.includes(id))] });
    return !this.failed;
  }
}
