// The first steps, run. content/tutorial.js says what there is to learn and in
// what order; this decides which step is showing, what it points at in the
// world, and when it has been done. It announces on the bus and the interface
// (ui/tutor.js) draws the card, the marker and the ring round a button:
//
//   guide          the step to show (or null to show nothing): { id, chapter, title, index, total, text, touch, keys, spot, tip }
//   guide:goal     what the step points at now: an entity, a point { x, y, z }, or null
//   guide:step     a step was done ({ id })         guide:chapter   a new chapter begins ({ id, title })
//   guide:done     the first steps are over ({ skipped, quiet })
//
// The first steps run once: a browser that has finished or skipped them is not
// shown them again (the pause menu can start them over, and ?firststeps in the
// address forces them). While they run the board's first card is First Light,
// the contract laid out to teach on (sim/systems/missions.js).

import { STEPS, TIPS, CHAPTERS } from '../content/tutorial.js';

const KEY = 'lumenwake.firststeps';
const LOOKAHEAD = 3;          // steps ahead an event may be answered for: someone who runs ahead is not held back

export class Tutorial {
  constructor(game) {
    this.game = game;
    this.i = -1;                 // the step showing (-1: the first steps are not running)
    this.time = 0;               // seconds in this step
    this.goal = null;
    this.count = {};             // how many times each event has been heard during this step
    this.hidden = false;         // a cinematic is playing: nothing is shown until it is over
    this.tip = null; this.tipped = {};
    this.from = null;
    this.pulse = 0; this.look = 0;
    const bus = game.bus;
    bus.on('begin', () => this.begin());
    bus.on('guide:skip', (d) => this.finish(true, d && d.quiet));
    bus.on('guide:restart', () => this.restart());
    const events = new Set([...STEPS, ...TIPS].flatMap((s) => [s.on, s.until]).filter(Boolean));
    for (const ev of events) bus.on(ev, (payload) => this.heard(ev, payload));
    // lifted out of First Light without finishing it: back to the dispatcher for it
    bus.on('mission:report', (r) => { if (this.running && !r.won) this.go(STEPS.findIndex((s) => s.id === 'talk')); });
  }

  get running() { return this.i >= 0; }
  get step() { return this.i >= 0 ? STEPS[this.i] : null; }

  /** Has this browser been through them already? */
  seen() { try { return localStorage.getItem(KEY) === 'done' && !/[?&]firststeps\b/.test(location.search); } catch { return false; } }
  remember() { try { localStorage.setItem(KEY, 'done'); } catch { /* storage is off: they will simply be offered again */ } }

  begin() {
    if (this.seen()) return;
    this.start();
  }
  start() {
    const g = this.game;
    g.player.sheet.first = true;
    if (!g.missions.active && !g.missions.pending) g.missions.refresh();
    this.go(0);
  }
  restart() {
    if (this.game.missions.active) return;          // only from the town
    this.tipped = {};
    this.start();
  }

  go(i) {
    const g = this.game;
    // steps that have nothing to teach right now are passed by
    while (i < STEPS.length && STEPS[i].skip && STEPS[i].skip(g, this)) i++;
    if (i >= STEPS.length) return this.finish(false);
    const before = this.step;
    this.i = i; this.time = 0; this.count = {}; this.goal = null; this.pulse = 0;
    this.from = { ...g.camera.goal };
    const s = STEPS[i];
    if (!before || before.chapter !== s.chapter) g.bus.emit('guide:chapter', { id: s.chapter, title: CHAPTERS[s.chapter] });
    if (s.enter) s.enter(g, this);
    this.announce();
  }

  next() {
    this.game.bus.emit('guide:step', { id: this.step.id });
    this.go(this.i + 1);
  }

  finish(skipped, quiet = false) {
    const g = this.game, was = this.running;
    this.i = -1; this.goal = null;
    if (skipped && g.player.sheet.first && !g.missions.active && !(g.missions.pending && g.missions.pending.first)) { g.player.sheet.first = false; g.missions.refresh(); }
    if (!quiet) this.remember();
    g.bus.emit('guide', null);
    g.bus.emit('guide:goal', null);
    if (was || skipped) g.bus.emit('guide:done', { skipped, quiet });
  }

  announce() {
    const g = this.game, s = this.step;
    if (!s || this.hidden) return;
    const mates = STEPS.filter((o) => o.chapter === s.chapter);
    g.bus.emit('guide', { id: s.id, chapter: s.chapter, title: CHAPTERS[s.chapter], index: mates.indexOf(s), total: mates.length, text: s.text, touch: s.touch, keys: s.keys, spot: s.spot, touchSpot: s.touchSpot });
    this.aim(true);
  }

  // ---------------------------------------------------------------- what a step points at
  /** The thing a name in a step's `point` stands for, now: an entity, a point, or null. */
  target(name) {
    const g = this.game, p = g.player, w = g.world;
    if (!name) return null;
    const nearest = (list) => list.reduce((best, e) => (!best || Math.hypot(e.x - p.x, e.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z) ? e : best), null);
    if (name === 'npc:bounty') return g.entities.list.find((e) => e.kind === 'npc' && e.role === 'bounty') || null;
    if (name === 'pad') { const s = w.structures.find((o) => o.role === 'deploy'); return s ? { x: s.x, y: w.surface(s.x, s.z), z: s.z } : null; }
    if (name === 'foe') return nearest(g.monsters.filter((m) => !m.dead && !m.boss));
    if (name === 'boss') return g.monsters.find((m) => m.boss && !m.dead) || null;
    if (name === 'drop') return nearest(g.loot.drops.filter((d) => !d.gone));
    if (name === 'pod') { const a = g.missions.active; const s = nearest(w.structures.filter((o) => o.role === 'pod' && !o.pal && !o.terrace && (!a || a.rooms[o.room].state === 'clear'))); return s ? { x: s.x, y: w.surface(s.x, s.z), z: s.z } : null; }
    if (name === 'gap') {
      // the near edge of the break in the first broken bridge; once across, the island beyond it
      const l = w.nav.links.find((k) => k.gap && k.part !== 2);
      if (!l) return null;
      const along = (p.x - l.ax) * l.ux + (p.z - l.az) * l.uz, t = l.tmax - 0.7, far = w.rooms[l.b];
      return along > l.tmax + 0.4 ? { x: far.x, y: w.surface(far.x, far.z), z: far.z } : { x: l.ax + l.ux * t, y: w.surface(l.ax + l.ux * t, l.az + l.uz * t), z: l.az + l.uz * t };
    }
    if (name.startsWith('site:')) return g.entities.list.find((e) => e.kind === 'site' && e.site === name.slice(5) && !e.gone) || null;
    if (name.startsWith('room:')) {
      const want = name.slice(5), r = /^\d+$/.test(want) ? w.rooms[+want] : w.rooms.find((q) => q.kind === want);
      return r ? { x: r.x, y: w.surface(r.x, r.z), z: r.z } : null;
    }
    return null;
  }
  aim(force = false) {
    const s = this.step, goal = s ? this.target(s.point) : null;
    const same = goal === this.goal || (goal && this.goal && goal.kind === undefined && this.goal.kind === undefined && goal.x === this.goal.x && goal.z === this.goal.z);
    if (same && !force) return;
    this.goal = goal;
    this.game.bus.emit('guide:goal', goal);
  }

  // ---------------------------------------------------------------- tests a step may ask
  near(d) { const p = this.game.player, t = this.goal; return !!t && Math.hypot(t.x - p.x, t.z - p.z) < d; }
  turned() { const c = this.game.camera.goal, f = this.from; return !!f && (Math.abs(c.yaw - f.yaw) > 0.45 || Math.abs(c.pitch - f.pitch) > 0.18 || Math.abs(c.distance / f.distance - 1) > 0.14); }

  // ---------------------------------------------------------------- hearing and watching
  heard(ev, payload) {
    const g = this.game;
    if (this.tip && this.tip.def.until === ev) this.endTip();
    for (const t of TIPS) if (t.on === ev && !this.tipped[t.id]) this.showTip(t);
    if (!this.running) return;
    this.count[ev] = (this.count[ev] || 0) + 1;
    // the step showing, or one a little further on that this already answers
    for (let k = this.i; k <= Math.min(this.i + LOOKAHEAD, STEPS.length - 1); k++) {
      const s = STEPS[k];
      if (s.on !== ev || (s.if && !s.if(payload, g, this))) continue;
      if (k !== this.i && s.chapter !== this.step.chapter) break;
      this.i = k;
      return this.next();
    }
  }

  showTip(def) {
    this.tipped[def.id] = true;
    this.tip = { def, left: def.seconds };
    this.game.bus.emit('guide:tip', { id: def.id, text: def.text, touch: def.touch, keys: def.keys, spot: def.spot, touchSpot: def.touchSpot });
  }
  endTip() { this.tip = null; this.game.bus.emit('guide:tip', null); }

  update(dt) {
    const g = this.game;
    if (g.paused) return;
    // a cinematic has the screen: say nothing until it is over, then say it again
    const hide = g.cinema.blocking;
    if (hide !== this.hidden) { this.hidden = hide; if (hide) { g.bus.emit('guide', null); g.bus.emit('guide:goal', null); } else this.announce(); }
    // tips: once each, when they first apply
    if (this.tip) { this.tip.left -= dt; if (this.tip.left <= 0 || (this.tip.def.when && !this.tip.def.when(g, this))) this.endTip(); }
    else if (!hide) for (const t of TIPS) if (t.when && !this.tipped[t.id] && t.when(g, this)) { this.showTip(t); break; }
    const s = this.step;
    if (!s || hide) return;
    this.time += dt;
    if ((this.look -= dt) <= 0) { this.look = 0.3; this.aim(); }
    // a ring keeps being drawn on the ground where a step points, when that is a place and not a figure
    const t = this.goal;
    if (t && (t.kind === undefined || t.kind === 'drop') && (this.pulse -= dt) <= 0) { this.pulse = 0.9; g.fx.click(t.x, t.y ?? g.world.surface(t.x, t.z), t.z); }
    if ((s.when && s.when(g, this)) || (s.auto && this.time > s.auto)) this.next();
  }
}
