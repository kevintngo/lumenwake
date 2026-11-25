// The game: owns the world, the entities and the ordered list of systems, and
// runs the frame. Systems talk through `game.bus` events and shared state on
// `game`; none of them imports another. To add a feature, write a system with
// an update(dt) and add it to the list below.
//
// The frame has three parts. The player's hands (controls) are read unless a
// cinematic holds them. The rules (`this.sim`) run at the pace the director
// allows: 1 in play, 0 while a cinematic holds the world still, something
// between for slow motion. The picture (effects, the director, the camera, the
// renderer) always runs.

import { GAME } from '../config.js';
import { DEVICE } from '../core/device.js';
import { damp } from '../core/math.js';
import { EventBus } from '../core/events.js';
import { Input } from '../core/input.js';
import { World } from '../world/world.js';
import { Renderer } from '../gfx/renderer.js';
import { Camera } from '../gfx/camera.js';
import { Entities, makeEntity, pencils } from '../sim/entities.js';
import { createEnv, updateEnv } from './environment.js';
import { derive, newPlayerSheet } from '../sim/stats.js';
import { issue, claimUids } from '../sim/items.js';
import { CLASSES } from '../content/classes.js';
import { PEOPLES } from '../content/peoples.js';
import { Fx } from './fx.js';
import { View } from './view.js';
import { Controls } from './controls.js';
import { Cinema } from './cinema.js';
import { Portraits } from './portrait.js';
import { PlayerSystem } from '../sim/systems/player.js';
import { MonsterAI } from '../sim/systems/ai.js';
import { Combat } from '../sim/systems/combat.js';
import { Relics } from '../sim/systems/relics.js';
import { Skills } from '../sim/systems/skills.js';
import { Spawner } from '../sim/systems/spawner.js';
import { Loot } from '../sim/systems/loot.js';
import { Missions, TOWN } from '../sim/systems/missions.js';
import { Crew } from '../sim/systems/crew.js';
import { Sites } from '../sim/systems/sites.js';
import { Companion } from '../sim/systems/companion.js';
import { hubSpec } from '../world/layout.js';
import { Tutorial } from './tutorial.js';
import { Hazards } from '../sim/systems/hazards.js';
import { SaveStore } from './save.js';

const HOLD_MAX = 0.14;     // seconds: the longest the world is ever held for one blow
const HOLD_RATE = 0.06;    // how fast time runs while it is held
const LOW_HEALTH = 0.3;    // share of health under which the page warns

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.touch = DEVICE.touch;      // fingers are the way in: the interface lays itself out for thumbs
    this.bus = new EventBus();
    this.input = new Input(canvas);
    // What is kept between visits (app/save.js): every surveyor this browser has, and which one is being played.
    // `?new` in the address starts as if there were none (it is dropped from the address so a reload continues).
    this.store = new SaveStore();
    this.account = this.store.loadAccount();
    this.hero = null;
    this.fresh = new URLSearchParams(location.search).has('new');
    if (this.fresh) { const q = new URLSearchParams(location.search); q.delete('new'); const left = q.toString(); history.replaceState(null, '', location.pathname + (left ? '?' + left : '') + location.hash); }
    this.world = new World(hubSpec(TOWN));        // every journey starts, and is picked up again, on the ship
    this.renderer = new Renderer(canvas, this.world, { lite: DEVICE.touch });
    this.camera = new Camera();
    this.env = createEnv();
    this.hour = this.world.biome().hour;
    this.savedView = null;      // the view the journey was last seen from
    this.entities = new Entities();
    this.monsters = [];
    this.look = { hurt: 0, fade: 0, fadeGoal: 1, veil: 0 };   // fade: how far the page has been drawn in; veil: a cinematic's own fade over it
    this.stop = 0;           // seconds the world is still held for a blow that landed (see hold)
    this.low = false;        // the hero's health is low
    this.paused = true;      // until the title screen is dismissed
    this.halt = false;       // a menu is holding the game still (the pause menu, the tabbed menu): see frame()
    this.time = 0;
    this.saveTimer = 8;

    const sheet = newPlayerSheet('vanguard');
    issue(sheet);
    const px = this.world.spec.start.x, pz = this.world.spec.start.z;
    this.player = this.entities.add(makeEntity('player', 'humanoid', {
      x: px, z: pz, y: this.world.surface(px, pz), yaw: 2.6, radius: 0.36, height: 1.6, ghost: true,
      colors: pencils([[214, 70, 52], [214, 70, 52], [122, 62, 44]]),   // the corps' red on the suit, a red scarf, umber hair
      name: 'Surveyor', sheet,
      intent: { moveX: 0, moveZ: 0, aim: null }, target: null, pursue: false, moveTo: null,
      attackCd: 0, calm: 10, invuln: 0, potionCd: 0, pending: null, dash: null, mend: null, safe: true,
    }));
    derive(this.player);
    this.player.hp = this.player.maxHp;
    this.player.focus = this.player.maxFocus;
    this.choosePeople('unit');
    this.biome = this.world.biome(px, pz);

    this.fx = new Fx(this);
    this.relics = new Relics(this);
    this.combat = new Combat(this);
    this.loot = new Loot(this);
    this.skills = new Skills(this);
    this.missions = new Missions(this);
    this.controls = new Controls(this);
    this.spawner = new Spawner(this);
    this.view = new View(this);
    // order matters: intent -> bodies -> consequences -> population
    this.tutorial = new Tutorial(this);
    this.hazards = new Hazards(this);
    this.sim = [new PlayerSystem(this), new MonsterAI(this), this.hazards, this.skills, this.loot, this.spawner, this.missions, new Crew(this), new Sites(this), (this.companion = new Companion(this)), this.relics];
    this.cinema = new Cinema(this);
    this.portraits = new Portraits(this);
    this.missions.arrive();
    this.companion.arrive();
    // What the rules announce and only the picture acts on: the weight of a blow, a fade, ground to draw again.
    this.bus.on('feel', (f) => {
      if (f.hold) this.hold(f.hold);
      if (f.shake) this.camera.shake = Math.min(1, this.camera.shake + f.shake);
      if (f.hurt) this.look.hurt = f.hurt;
    });
    this.bus.on('fade', (v) => { this.look.fadeGoal = v; });
    this.bus.on('world:changed', (chunks) => { for (const [cx, cz] of chunks) this.renderer.worldTex.refresh(cx, cz); });

    this.camera.target = [px, this.player.y + 1, pz];
    this.resize();
    addEventListener('resize', () => this.resize());
    addEventListener('beforeunload', () => this.save());
    addEventListener('pagehide', () => this.save());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });        // (a phone may never say more than this before the page is gone)
    // fill the whole window of world data before the first frame
    while (this.renderer.worldTex.update(px, pz, 16) > 0);
  }

  /** The picture is whatever box the page gives the canvas: the whole window, or the top of a phone held upright. */
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.renderer.resize(Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height)), Math.min(devicePixelRatio || 1, 2));
  }

  start() {
    let last = performance.now();
    const tick = (now) => {
      requestAnimationFrame(tick);
      const ms = now - last;
      last = now;
      this.frame(Math.min(ms / 1000, 0.05), ms);
    };
    requestAnimationFrame(tick);
  }

  /**
   * A blow that lands holds the world still for an instant, so it reads as weight
   * rather than as a number. Holds do not add up: the longest one asked for wins.
   */
  hold(seconds) {
    if (this.reducedMotion) return;
    this.stop = Math.max(this.stop, Math.min(seconds, HOLD_MAX));
  }

  frame(real, ms) {
    const p = this.player;
    // While a blow is held, the world all but stops; the camera, the page and the interface do not.
    let dt = real;
    if (this.stop > 0) { this.stop -= real; dt = real * HOLD_RATE; }
    // A menu that holds the game (ui/pause.js sets `halt`): the hands and the rules wait, and so do the clock,
    // the dust and the director. The camera, the page and the interface below carry on, so the picture is still drawn.
    const held = !!this.halt;
    if (held) dt = 0;
    this.time += dt;
    const cine = this.cinema;
    if (cine.blocking || held) this.controls.release(); else this.controls.update(dt);
    const pace = held ? 0 : cine.pace;
    if (pace > 0) for (const s of this.sim) s.update(dt * pace);
    this.tutorial.update(dt);                        // (held: no time passes for it, but a step done inside a menu is still seen)
    this.fx.update(pace > 0 ? dt * pace : dt);      // dust still settles while the world is held; it slows when the world does
    if (!held) cine.update(real);
    const w = this.world;        // (a system may have taken the hero to another zone)
    this.entities.sweep();
    this.bus.emit('frame', real);

    this.biome = w.biome(p.x, p.z);
    updateEnv(this.env, this.hour, this.biome.rock);
    this.env.pave = this.biome.realm === 1 ? 0 : 1;        // whatever the corps paves is deck plate (the ship, the pads, the bridges); the old halls are flagged
    this.env.realm = this.biome.realm || 0; this.env.wall = this.biome.walls || 0;
    // the weather drifts a little about what is usual for the place
    this.env.cloud = this.biome.cloud + 0.16 * Math.sin(this.time / 83 + p.x * 0.002) * Math.cos(this.time / 131 + p.z * 0.0017);
    // Low on health: the red scribble at the page's edges stays, breathing slowly, until it is mended.
    const low = !p.dead && p.hp < p.maxHp * (this.low ? LOW_HEALTH + 0.08 : LOW_HEALTH);
    if (low !== this.low) { this.low = low; if (low && !this.paused) this.bus.emit('lowhealth', {}); }
    const floor = low ? 0.56 + (this.reducedMotion ? 0 : 0.14 * Math.sin(this.time * 3.2)) : 0;
    this.look.hurt = Math.max(floor, this.look.hurt - real * 2.2);
    this.look.fade = damp(this.look.fade, this.look.fadeGoal, 3, real);

    const at = cine.focus;        // a shot far from the hero keeps the ground under it drawn
    this.renderer.worldTex.update(at ? at[0] : p.x, at ? at[1] : p.z, 2);
    w.prune(p.x, p.z);
    this.portraits.update();       // (a likeness of the hero, if who they are has changed: taken and put away before the frame is drawn)
    this.camera.still = this.reducedMotion;      // no screen shake for those who ask for less motion
    this.camera.update(real, [p.x, p.y + 1.0, p.z], this.renderer.size.cssW / this.renderer.size.cssH, (x, z) => w.surface(x, z));
    if (!this.warmed) this.warmed = this.renderer.warm();
    this.renderer.adapt(ms);
    this.renderer.render(this.view.build(this.time));
    this.input.endFrame();

    this.saveTimer -= real;
    if (this.saveTimer <= 0) { this.saveTimer = 8; this.save(); }
  }

  /** Journeys are not kept yet. (When they are: write p.sheet, with a version number, from here.) */
  /**
   * Keeps the journey as it stands: the surveyor's sheet, how long they have been played, the view, and the
   * contract taken. Every few seconds, when a contract ends, and whenever the page is hidden or left.
   */
  save() {
    const h = this.hero;
    if (!h || !this.started) return;
    const now = performance.now();
    h.played += Math.min(60, Math.max(0, (now - (this.playedAt || now)) / 1000));        // (a tab left asleep is not time played)
    this.playedAt = now;
    h.sheet = this.player.sheet;
    h.saved = Date.now();
    h.view = [this.camera.goal.pitch, this.camera.goal.distance];
    const o = this.missions.pending || (this.missions.active && this.missions.active.offer);
    h.pending = o && !o.first ? { seed: o.seed, biome: o.biome } : null;
    this.store.saveHero(h, this.account);
  }

  /** Picks a kept journey up again: the surveyor as they were left, on the ship. (Called by the title screen.) */
  load(h) {
    const p = this.player;
    this.hero = h;
    p.sheet = h.sheet;
    claimUids(h.sheet);
    this.choosePeople(h.sheet.people || 'unit');
    derive(p);
    p.hp = p.maxHp; p.focus = p.maxFocus;
    this.missions.refresh();
    const o = h.pending && this.missions.offers.find((x) => x.seed === h.pending.seed && x.biome === h.pending.biome);
    this.missions.pending = o || null;
    this.savedView = h.view;
    this.bus.emit('class', { id: h.sheet.cls, cls: CLASSES[h.sheet.cls] });
    this.bus.emit('mission:taken', this.missions.pending);
  }

  /**
   * Leaves the zone the hero is in for another (the ship, or the place a mission is in): a new world,
   * nothing left of the old one but the hero. The page is blank for the instant it takes.
   */
  enter(spec) {
    const p = this.player;
    for (const e of this.entities.list) if (e !== p) e.gone = true;
    this.entities.sweep();
    this.monsters = [];
    this.loot.drops.length = 0;
    this.hazards.clear();
    this.fx.clear();
    this.world = new World(spec);
    this.renderer.setWorld(this.world);
    this.hour = this.world.biome().hour;
    this.biome = this.world.biome();
    Object.assign(p, { x: spec.start.x, z: spec.start.z, yaw: spec.start.yaw, target: null, pursue: false, moveTo: null, dash: null, action: 0, pending: null, mend: null, dead: false, grow: 1, invuln: 1.2, calm: 10 });
    p.y = this.world.surface(p.x, p.z);
    this.camera.target = [p.x, p.y + 1, p.z];
    this.camera.goal.yaw = this.camera.yaw = Math.PI - spec.start.yaw;
    while (this.renderer.worldTex.update(p.x, p.z, 16) > 0);
    this.look.fade = 0; this.look.fadeGoal = 1;
    this.bus.emit('zone', { spec, biome: this.biome });
  }

  /** Which of the peoples the hero is: how they are built and dressed, nothing more. */
  choosePeople(id) {
    const p = this.player, people = PEOPLES[id] || PEOPLES.human, cls = CLASSES[p.sheet.cls];
    p.sheet.people = id;
    p.build = p.extra = people.index; p.scale = people.scale; p.height = 1.6 * people.scale;      // (extra also carries what is worn: systems/player.js)
    p.seed = people.look ?? 0.62;          // one face for the hero, the same every visit
    // a unit's crest and scarf are in its class colour; the others wear the colour with a pale trim
    p.colors = pencils([cls.color, people.index === 0 ? cls.color : [236, 228, 210], people.hair[0]]);
    this.bus.emit('people', { id, people });
  }

  /** The class the journey is played as: a fresh sheet, the gear that class is issued, its colours. */
  chooseClass(id) {
    const p = this.player, cls = CLASSES[id], people = p.sheet.people;
    p.sheet = newPlayerSheet(id);
    issue(p.sheet);
    this.choosePeople(people || 'unit');
    derive(p);
    p.hp = p.maxHp; p.focus = p.maxFocus;
    this.missions.refresh();
    this.bus.emit('class', { id, cls });
  }

  /** Called by the title screen. */
  begin() {
    if (this.started) return;
    if (!this.hero) this.hero = this.store.newHero(this.player.sheet);        // a new surveyor: kept from this moment
    this.playedAt = performance.now();
    this.started = true;
    this.paused = false;
    this.bus.emit('begin');
    this.save();
  }
}
