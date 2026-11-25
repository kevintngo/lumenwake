// Missions: the whole loop of the game. On the ship the dispatcher's board
// offers contracts, each a seed for a place; taking one and stepping on the pad
// drops the hero there. A place is a string of islands. Each wakes when it is
// entered, sends its creatures in waves, and lets down the gate to the next
// when the last of them falls. The contract's goal (clear it, bring back the
// survey cores, bring down the elder) ends at the way out, and the pay is
// counted on the ship.
//
// A contract is small data: { seed, biome, rooms, goal, tier, name, xp, glint }.
// Everything else about the place is made from it (world/layout.js, world/zone.js).

import { hubSpec, missionSpec, firstSpec, rimAt } from '../../world/layout.js';
import { BIOMES, MISSION_BIOMES, biomeById } from '../../content/themes.js';
import { THREATS, THREAT_MAX, rollConditions, threatOf } from '../../content/threat.js';
import { mulberry32 } from '../../core/rng.js';
import { derive } from '../stats.js';
import { TOWN } from '../../content/town.js';
import { planEncounters } from '../encounters.js';
import { seedSim } from '../rng.js';
import { rollItem, itemName } from '../items.js';
import { CREATURES } from '../../content/creatures.js';
import { CLASSES } from '../../content/classes.js';
import { rand } from '../rng.js';

export const GOALS = {
  sweep: { name: 'Clear the way', brief: 'Clear every island on the way to the far pad.' },
  recover: { name: 'Recover the cores', brief: 'Survey cores went down in supply pods. Find them and bring them out.' },
  hunt: { name: 'Bring down the elder', brief: 'Something old holds the last island. Put it down.' },
};
/** A new surveyor's first contract (world/layout.js firstSpec): short, laid out by hand, an easier elder at the end. */
export const FIRST = { seed: 4099, biome: 'glasswood', goal: 'hunt', tier: 1, rooms: 2, name: 'First Light', xp: 90, glint: 60, first: true };
const NAMES_A = ['Quiet', 'Long', 'Broken', 'High', 'Pale', 'Far', 'Hollow', 'Bright', 'Last', 'Low', 'Wide', 'Thin'];
const NAMES_B = ['Stair', 'Reach', 'Chain', 'Crossing', 'Ledge', 'Span', 'Garden', 'Shelf', 'Rise', 'Hollow', 'Walk', 'Crown'];

export class Missions {
  constructor(game) {
    this.game = game;
    this.offers = [];
    this.pending = null;       // a contract taken on the ship, waiting for the pad
    this.active = null;        // the contract being run: { offer, rooms: [state], cores, need, done, t }
    this.report = null;        // the last mission's outcome, shown on the ship
    this.padT = 0;
    this.stock = [];           // gear the outfitter has for sale: rolled with the board
    game.bus.on('player:respawn', () => { if (this.active) this.home(false); });
  }

  // ---------------------------------------------------------------- the ship
  /** The hero steps onto the deck (at the start, and after every mission). */
  arrive() {
    const g = this.game;
    for (const n of TOWN.crew) g.spawner.spawnNpc(n);
    for (const gate of g.world.gates) gate.shut = false;
    this.refresh();
  }

  /** Posts three contracts for the hero's level. The same board until one is run. */
  refresh() {
    const s = this.game.player.sheet;
    const rnd = mulberry32(((s.board || 0) * 7919 + 1013) >>> 0);
    seedSim(((s.board || 0) + 1) * 2654435761);
    this.stock = [0, 1, 2, 3].map((k) => rollItem({ ilvl: Math.max(1, s.level), cls: s.cls, rarity: k === 3 ? 2 : 1, slot: ['weapon', 'frame', 'unit', undefined][k] }));
    const goals = ['sweep', 'recover', 'hunt'], first = Math.floor(rnd() * MISSION_BIOMES.length);
    this.offers = [0, 1, 2].map((k) => {
      const biome = MISSION_BIOMES[(first + k) % MISSION_BIOMES.length];        // three different places every time
      const goal = goals[(k + (s.board || 0)) % 3];
      const tier = Math.max(1, s.level + k - 1 + (goal === 'hunt' ? 1 : 0));
      const rooms = Math.min(6, 3 + Math.floor(rnd() * 2) + Math.floor(tier / 4));
      const seed = Math.floor(rnd() * 2 ** 31);
      // a place surveyed before answers harder, and differently each time (content/threat.js)
      const threat = Math.min(THREAT_MAX, (s.threat && s.threat[biome]) | 0), pay = THREATS[threat].pay;
      return {
        seed, biome, goal, tier, rooms,
        threat, conditions: rollConditions(threat, { biome, goal }, mulberry32((seed ^ 0x51ed270b) >>> 0)),
        name: `${NAMES_A[Math.floor(rnd() * NAMES_A.length)]} ${NAMES_B[Math.floor(rnd() * NAMES_B.length)]}`,
        xp: Math.round((30 + rooms * 14) * (1 + 0.3 * (tier - 1)) * (goal === 'hunt' ? 1.3 : 1) * pay),
        glint: Math.round((22 + rooms * 9) * (1 + 0.25 * (tier - 1)) * pay),
      };
    });
    if (s.first) this.offers[0] = { ...FIRST };          // until it has been run, the first card on the board is First Light
  }

  accept(i) {
    if (!this.offers[i] || this.active) return;
    this.pending = this.offers[i];
    this.game.bus.emit('mission:taken', this.pending);
  }
  drop() { this.pending = null; this.game.bus.emit('mission:taken', null); }

  // ---------------------------------------------------------------- going down
  deploy() {
    const g = this.game, offer = this.pending;
    const spec = offer.first ? firstSpec(offer) : missionSpec(offer);
    const rnd = mulberry32((offer.seed ^ 0x2545f491) >>> 0);
    let need = spec.laid ? 0 : planEncounters(spec, biomeById(offer.biome), offer, rnd);          // (a laid-out place brings its own creatures)
    seedSim(offer.seed);          // the fights of a contract roll the same way each time it is run
    g.enter(spec);
    const pods = g.world.structures.filter((s) => s.role === 'pod');
    if (offer.goal === 'recover') {
      const main = pods.filter((p) => spec.rooms[p.room].kind === 'fight' && !p.terrace);        // (a core is never up on a terrace: the contract can be finished without a jump)
      for (let k = 0; k < need; k++) main[Math.floor((k + 0.5) * main.length / need)].core = true;
      need = main.filter((p) => p.core).length;
    }
    this.active = {
      offer, need, cores: 0, done: false, over: 0, kills: 0, time: 0,
      marks: 0, markNeed: g.world.structures.filter((s) => s.site === 'mark').length, revealed: false,        // (sim/systems/sites.js)
      rooms: spec.rooms.map((r) => ({ state: r.waves.length ? 'asleep' : 'clear', wave: -1, alive: [] })),
    };
    this.pending = null;
    this.openGates(0, true);
    const T = this.threat = threatOf(offer);
    if (T.hour != null) g.hour = T.hour;
    g.bus.emit('mission:begin', { offer, biome: g.biome, goal: GOALS[offer.goal], threat: T });
    if (T.rank) g.bus.emit('log', { text: `Threat: ${T.name}.${T.list.map((c) => ` ${c.name}: ${c.text}`).join('')}` });
    if (!g.player.sheet.missions) g.bus.emit('log', { text: 'A jump clears a gap, gets you onto a terrace, and takes you over a blow that runs along the ground.' });
  }

  /** Lets down the gates on the bridges that leave a room. */
  openGates(room, quiet = false) {
    const g = this.game;
    for (const gate of g.world.gates) {
      if (gate.link.a !== room || !gate.shut) continue;
      gate.shut = false;
      g.bus.emit('world:changed', g.world.setState(gate.st, 1));
      if (!quiet) g.bus.emit('gate:open', { x: gate.x, y: g.world.surface(gate.x, gate.z), z: gate.z });
    }
  }

  // ---------------------------------------------------------------- each frame
  update(dt) {
    const g = this.game, p = g.player, w = g.world;
    if (g.paused || p.dead) return;
    const a = this.active;
    if (!a) {
      // on the ship: a contract in hand and both feet on the pad sends the hero down
      const pad = w.structures.find((s) => s.role === 'deploy');
      const on = pad && Math.hypot(p.x - pad.x, p.z - pad.z) < 1.9;
      if (on && this.pending) {
        this.padT += dt;
        g.bus.emit('fade', this.padT > 0.5 ? 0 : 1);
        if (this.padT > 1.15) { this.padT = 0; this.deploy(); }
      } else {
        if (on && !this.pending && this.padT === 0) { this.padT = -1; g.bus.emit('log', { text: 'The pad is cold. Take a contract from Ilse, at the hall, first.' }); }
        if (!on) this.padT = 0;
        g.bus.emit('fade', 1);
      }
      return;
    }
    a.time += dt;
    if (a.over > 0) { a.over -= dt; g.bus.emit('fade', a.over < 0.7 ? 0 : 1); if (a.over <= 0) this.home(true); return; }

    // an island wakes when the hero is well onto it
    // (an elder waits until the hero is well out onto its island, and then the way back is shut)
    const here = w.roomAt(p.x, p.z, 1.8);
    if (here >= 0 && a.rooms[here].state === 'asleep' && (w.rooms[here].kind !== 'boss' || w.roomAt(p.x, p.z, 6) === here)) {
      a.rooms[here].state = 'awake';
      if (w.rooms[here].kind === 'boss') this.seal(here, true);
      this.nextWave(here);
    }
    for (let i = 0; i < a.rooms.length; i++) {
      const rs = a.rooms[i];
      if (rs.state !== 'awake') continue;
      rs.alive = rs.alive.filter((m) => !m.gone && (!m.dead || m.def.fall));        // an elder still coming down still holds its island
      if (rs.alive.length) continue;
      if (rs.wave + 1 < w.rooms[i].waves.length) { if ((rs.wait = (rs.wait ?? 0.9) - dt) <= 0) { rs.wait = undefined; this.nextWave(i); } }
      else {
        rs.state = 'clear';
        this.openGates(i);
        // on First Light the first island always gives up a better weapon, so there is something to put on
        if (this.active.offer.first && i === 1) g.loot.dropGear(w.rooms[i].x, w.surface(w.rooms[i].x, w.rooms[i].z), w.rooms[i].z, rollItem({ ilvl: 2, cls: p.sheet.cls, family: CLASSES[p.sheet.cls].family, slot: 'weapon', rarity: 1 }));
        g.bus.emit('room:clear', { room: i, kind: w.rooms[i].kind });
        if (w.rooms[i].kind === 'boss') { this.seal(i, false); this.finish(); }
      }
    }

    // supply pods open to a hand
    for (const s of w.structures) {
      if (s.role !== 'pod' || s.pal || Math.hypot(p.x - s.x, p.z - s.z) > 1.75) continue;
      if (a.rooms[s.room].state === 'awake') continue;      // not while the island is still fighting
      g.bus.emit('world:changed', w.setState(s, 1));
      g.loot.spill(s.x, w.surface(s.x, s.z), s.z, a.offer.tier, s.core);
      g.bus.emit('pod:open', { x: s.x, y: w.surface(s.x, s.z), z: s.z, core: !!s.core });
      if (s.core) { a.cores++; g.bus.emit('mission:progress', this.track()); }
    }

    // the way out
    const out = w.structures.find((s) => s.role === 'leave');
    if (out && Math.hypot(p.x - out.x, p.z - out.z) < 1.9) {
      if (this.met()) { this.padT += dt; if (this.padT > 0.6) { this.padT = 0; this.finish(); } }
      else if (this.padT === 0) { this.padT = -1; g.bus.emit('log', { text: a.offer.goal === 'recover' ? `Not yet: ${a.need - a.cores} of the cores are still out there.` : 'Not yet: an island on the way is not clear.' }); }
    } else this.padT = 0;
  }

  /** Shuts (or lets down again) the gates on the bridges that lead onto an island. */
  seal(room, shut) {
    const g = this.game;
    for (const gate of g.world.gates) {
      if (gate.link.b !== room || gate.shut === shut) continue;
      gate.shut = shut;
      g.bus.emit('world:changed', g.world.setState(gate.st, shut ? 0 : 1));
      g.bus.emit(shut ? 'gate:shut' : 'gate:open', { x: gate.x, y: g.world.surface(gate.x, gate.z), z: gate.z });
    }
  }

  nextWave(i) {
    const g = this.game, w = g.world, room = w.rooms[i], rs = this.active.rooms[i], p = g.player;
    const list = room.waves[++rs.wave];
    const T = this.threat || threatOf(this.active.offer);
    const level = this.active.offer.tier + T.level;
    let led = !T.leader || room.kind !== 'fight';        // (an elder creature leads each pack on the way, when the place is like that)
    list.forEach((id, k) => {
      const boss = id[0] === '@';
      if (boss) id = id.slice(1);
      // in a ring about the middle of the island, on the far side from the hero first
      let x = room.x, z = room.z;
      for (let tries = 0; tries < 24; tries++) {
        const away = Math.atan2(room.x - p.x, room.z - p.z);
        const ang = boss ? away : away + (k - (list.length - 1) / 2) * 0.75 + (rand() - 0.5) * 0.5 + tries * 0.9;
        const d = (boss ? 0.2 : 0.35 + rand() * 0.3) * rimAt(room, ang);
        x = room.x + Math.sin(ang) * d; z = room.z + Math.cos(ang) * d;
        if (Math.hypot(x - p.x, z - p.z) > 4.5 && w.walkable(x, z)) break;
      }
      const lead = !boss && !led;
      if (lead) led = true;
      const m = g.spawner.spawnMonster(id, x, z, level + (boss ? 1 : 0), lead);
      this.temper(m);
      m.room = i;
      if (boss) m.yaw = Math.atan2(-(p.x - x), p.z - z);        // it wakes facing whoever woke it
      if (boss && this.active.offer.first) { m.maxHp = m.hp = Math.round(m.maxHp * 0.4); m.atk *= 0.7; }      // the first elder is a gentler one
      m.ai.provoked = true;          // they came for the hero
      rs.alive.push(m);
      g.bus.emit('spawn:in', { x, y: w.surface(x, z), z, r: m.radius });
      if (boss) g.bus.emit('boss:arrive', m);
    });
    g.bus.emit('room:wave', { room: i, wave: rs.wave, of: room.waves.length, kind: room.kind });
  }

  /**
   * What the place's threat does to a creature as it appears: more health and harder blows, quicker if the
   * place is like that, a darker coat and a little more size so that it looks what it is, and what it leaves
   * when it falls. (Every creature of a contract passes through here: packs, what an elder calls, what guards a site.)
   */
  temper(m) {
    const T = this.threat;
    if (!T || !this.active || (!T.rank && !T.list.length)) return m;
    m.maxHp = m.hp = Math.round(m.maxHp * T.hp);
    m.atk *= T.atk;
    m.threat = T.rank;
    m.quick = T.quick; m.aggroMul = T.aggro; m.glintMul = T.glint; m.luck = T.luck;
    if (m.boss) m.rageAt = T.rageAt;
    else {
      if (T.burst) m.burst = T.burst;
      m.scale *= 1 + 0.02 * T.rank;
      m.colors[0] = m.colors[0].map((c, i) => c * (1 - 0.07 * T.rank) + [0.29, 0.3, 0.37][i] * 0.07 * T.rank);
    }
    return m;
  }

  onKill() { if (this.active) this.active.kills++; }

  /** A boss calls others in: `n` of a kind appear round it and count toward its island. */
  reinforce(boss, id, n) {
    const g = this.game, w = g.world, a = this.active;
    if (!a || !CREATURES[id]) return;
    const rs = a.rooms[boss.room];
    if (rs.alive.filter((m) => !m.dead && !m.boss).length >= 5) return;      // enough company already
    for (let k = 0; k < n; k++) {
      const ang = rand() * 6.283, d = 2.5 + rand() * 2.5;
      let x = boss.x + Math.sin(ang) * d, z = boss.z + Math.cos(ang) * d;
      if (!w.walkable(x, z)) { x = boss.x; z = boss.z; }
      const m = g.spawner.spawnMonster(id, x, z, Math.max(1, boss.level - 1));
      this.temper(m);
      m.room = boss.room; m.ai.provoked = true; m.called = true;
      rs.alive.push(m);
      g.bus.emit('spawn:in', { x, y: w.surface(x, z), z, r: m.radius });
    }
  }

  /** Is the contract's goal met? */
  met() {
    const a = this.active, w = this.game.world;
    if (!a) return false;
    if (a.offer.goal === 'recover') return a.cores >= a.need;
    if (a.offer.goal === 'hunt') return a.rooms.some((rs, i) => w.rooms[i].kind === 'boss' && rs.state === 'clear');
    return a.rooms.every((rs, i) => !w.rooms[i].main || rs.state === 'clear');
  }

  /** The line the tracker shows. */
  track() {
    const a = this.active, w = this.game.world;
    if (!a) return this.pending ? `${this.pending.name}: step onto the pad` : '';
    if (a.done) return a.over > 3 ? `Done: lifting out in ${Math.ceil(a.over)}` : 'Done: lifting out';
    const side = a.markNeed && a.marks < a.markNeed ? ` · Survey marks ${a.marks} of ${a.markNeed}` : '';
    return this.goalLine(a, w) + side;
  }
  goalLine(a, w) {
    if (a.offer.goal === 'recover') return a.cores >= a.need ? 'Cores recovered: reach the far pad' : `Survey cores: ${a.cores} of ${a.need}`;
    if (a.offer.goal === 'hunt') return 'Find the elder on the last island';
    const main = a.rooms.filter((_, i) => w.rooms[i].kind === 'fight'), left = main.filter((r) => r.state !== 'clear').length;
    return left ? `Islands to clear: ${left}` : 'All clear: reach the far pad';
  }

  /** The goal is met: a breath, then home. */
  finish() {
    const a = this.active;
    if (a.done) return;
    a.done = true; a.over = a.offer.goal === 'hunt' ? 10 : 2.6;       // after an elder there is time to pick up what it dropped
    this.game.bus.emit('mission:done', { offer: a.offer });
  }

  /** Back to the ship, paid or not. */
  home(won) {
    const g = this.game, p = g.player, a = this.active, s = p.sheet;
    // every survey mark logged adds to the pay, and all of them make the piece of gear a better one
    const extra = 1 + 0.15 * a.marks, all = a.markNeed > 0 && a.marks >= a.markNeed;
    this.report = { won, offer: a.offer, kills: a.kills, time: a.time, xp: won ? Math.round(a.offer.xp * extra) : 0, glint: won ? Math.round(a.offer.glint * extra) : 0, marks: a.marks, markNeed: a.markNeed };
    // the place remembers: surveyed and won, it is more dangerous next time; beaten there, it settles a little
    const T = this.threat || threatOf(a.offer);
    this.threat = null;
    if (!a.offer.first) {
      s.threat = s.threat || {};
      const was = (s.threat[a.offer.biome] | 0), now = Math.max(0, Math.min(THREAT_MAX, was + (won ? 1 : -1)));
      s.threat[a.offer.biome] = now;
      if (now !== was) this.report.threat = { was, now, name: THREATS[now].name };
    }
    s.boon = null;          // what a crystal lent goes back
    if (won) g.loot.gather();          // whatever is still lying about comes up with the hero
    this.active = null;
    g.enter(hubSpec(TOWN));
    this.arrive();
    if (won) {
      s.board = (s.board || 0) + 1; s.missions = (s.missions || 0) + 1;
      if (a.offer.first) { s.first = false; g.loot.add('wisp_ember', 6); }       // and enough for the lumen's first change comes home with it
      s.glint += this.report.glint;
      // every contract pays one piece of gear on top: at least tuned, better from a hunt
      const prize = rollItem({ ilvl: a.offer.tier, cls: s.cls, family: CLASSES[s.cls].family, rarity: Math.min(3, (a.offer.goal === 'hunt' ? 2 : 1) + (all ? 1 : 0)), luck: 0.4 + T.luck });      // always something this class can use
      if (s.gear.length < 20) { s.gear.push(prize); this.report.prize = prize; this.report.prizeName = itemName(prize); }
      this.refresh();
      g.combat.grantXp(this.report.xp);
    }
    derive(p);
    p.hp = p.maxHp; p.focus = p.maxFocus;
    g.save();
    g.bus.emit('mission:report', this.report);
  }
}

export { TOWN, BIOMES };
