import { DEVICE } from '../core/device';
import { EventBus } from '../core/event-bus';
import { Input } from '../core/input';
import { damp } from '../core/math';
import { CLASSES } from '../data/classes';
import { PEOPLES } from '../data/peoples';
import { TALENTS } from '../data/talents';
import { TOWN } from '../data/town';
import { Camera } from '../rendering/camera';
import { Renderer } from '../rendering/renderer';
import { PlayerSystem } from '../sim/character/player-system';
import { derive, newPlayerSheet } from '../sim/character/stats';
import { takeTalent } from '../sim/character/talents';
import { Combat } from '../sim/combat/combat-system';
import { Hazards } from '../sim/combat/hazards-system';
import { MonsterAI } from '../sim/combat/monster-ai-system';
import { Relics } from '../sim/combat/relics-system';
import { Skills } from '../sim/combat/skills-system';
import { Companion } from '../sim/companion/companion-system';
import { Entities, makeEntity, pencils } from '../sim/entities';
import { claimUids, issue } from '../sim/inventory/gear-service';
import { Loot } from '../sim/inventory/loot-system';
import { Crew } from '../sim/missions/crew-system';
import { Missions } from '../sim/missions/missions-system';
import { Sites } from '../sim/missions/sites-system';
import { Spawner } from '../sim/spawner-system';
import type { AttrKey, ClassId, PeopleId, TalentId } from '../types/domain';
import type { MonsterEntity, PlayerEntity } from '../types/entity';
import type { GameEventMap } from '../types/events';
import type { GameContext, SimSystem } from '../types/game-context';
import type { LookState, RenderEnv, UiSettings } from '../types/render';
import type { SaveAccount, SaveHero } from '../types/sheet';
import type { BiomeDef, WorldLike, ZoneSpec } from '../types/world';
import { hubSpec } from '../world/layout';
import { World } from '../world/world';
import { Cinema } from './cinema-director';
import { Controls } from './controls';
import { createEnv, updateEnv } from './environment';
import { Fx } from './fx-system';
import { Portraits } from './portrait-studio';
import { SaveStore } from './save-store';
import { Tutorial } from './tutorial-runner';
import { View } from './view-builder';

const HOLD_MAX = 0.14;
const HOLD_RATE = 0.06;
const LOW_HEALTH = 0.3;

export class Game implements GameContext {
  readonly canvas: HTMLCanvasElement;
  touch: boolean;
  readonly bus: EventBus<GameEventMap>;
  readonly input: Input;
  readonly store: SaveStore;
  account: SaveAccount;
  hero: SaveHero | null = null;
  fresh: boolean;
  started = false;
  paused = true;
  halt = false;
  reducedMotion = false;
  low = false;
  time = 0;
  hour: number;
  biome: BiomeDef;
  world: WorldLike;
  readonly renderer: Renderer;
  readonly camera: Camera;
  readonly env: RenderEnv;
  readonly look: LookState = { hurt: 0, fade: 0, fadeGoal: 1, veil: 0 };
  savedView: [number, number] | null = null;
  settings: UiSettings | null = null;
  readonly entities: Entities;
  readonly player: PlayerEntity;
  monsters: MonsterEntity[] = [];
  readonly fx: Fx;
  readonly view: View;
  readonly controls: Controls;
  readonly cinema: Cinema;
  readonly portraits: Portraits;
  readonly tutorial: Tutorial;
  readonly combat: Combat;
  readonly relics: Relics;
  readonly skills: Skills;
  readonly loot: Loot;
  readonly spawner: Spawner;
  readonly missions: Missions;
  readonly hazards: Hazards;
  readonly companion: Companion;
  private readonly sim: SimSystem[];
  private stop = 0;
  private saveTimer = 8;
  private playedAt = 0;
  private warmed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.touch = DEVICE.touch;
    this.bus = new EventBus<GameEventMap>();
    this.input = new Input(canvas);
    this.store = new SaveStore();
    this.account = this.store.loadAccount();
    this.fresh = new URLSearchParams(location.search).has('new');
    if (this.fresh) {
      const q = new URLSearchParams(location.search);
      q.delete('new');
      const left = q.toString();
      history.replaceState(null, '', location.pathname + (left ? '?' + left : '') + location.hash);
    }

    this.world = new World(hubSpec(TOWN));
    this.renderer = new Renderer(canvas, this.world, { lite: DEVICE.touch });
    this.camera = new Camera();
    this.env = createEnv();
    this.hour = this.world.biome().hour;
    this.entities = new Entities();

    const sheet = newPlayerSheet('vanguard');
    issue(sheet);
    const px = this.world.spec.start.x;
    const pz = this.world.spec.start.z;
    this.player = this.entities.add(
      makeEntity<PlayerEntity>('player', 'humanoid', {
        x: px,
        z: pz,
        y: this.world.surface(px, pz),
        yaw: 2.6,
        radius: 0.36,
        height: 1.6,
        ghost: true,
        colors: pencils([
          [214, 70, 52],
          [214, 70, 52],
          [122, 62, 44],
        ]),
        name: 'Surveyor',
        sheet,
        intent: { moveX: 0, moveZ: 0, aim: null },
        target: null,
        pursue: false,
        moveTo: null,
        attackCd: 0,
        calm: 10,
        invuln: 0,
        potionCd: 0,
        pending: null,
        dash: null,
        mend: null,
        safe: true,
        aloft: false,
        air: 0,
        vy: 0,
        safeX: px,
        safeZ: pz,
        chain: 0,
        chainT: 0,
        respawnT: 0,
        rush: 0,
        vigilUsed: false,
        ward: 0,
      }),
    );
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
    this.tutorial = new Tutorial(this);
    this.hazards = new Hazards(this);
    this.companion = new Companion(this);

    this.sim = [
      new PlayerSystem(this),
      new MonsterAI(this),
      this.hazards,
      this.skills,
      this.loot,
      this.spawner,
      this.missions,
      new Crew(this),
      new Sites(this),
      this.companion,
      this.relics,
    ];

    this.cinema = new Cinema(this);
    this.portraits = new Portraits(this);
    this.missions.arrive();
    this.companion.arrive();

    this.bus.on('feel', (f) => {
      if (f.hold) this.hold(f.hold);
      if (f.shake) this.camera.shake = Math.min(1, this.camera.shake + f.shake);
      if (f.hurt) this.look.hurt = f.hurt;
    });
    this.bus.on('fade', (v) => {
      this.look.fadeGoal = v;
    });
    this.bus.on('world:changed', (chunks) => {
      for (const [cx, cz] of chunks) this.renderer.worldTex.refresh(cx, cz);
    });

    this.camera.target = [px, this.player.y + 1, pz];
    this.resize();
    addEventListener('resize', () => this.resize());
    addEventListener('beforeunload', () => this.save());
    addEventListener('pagehide', () => this.save());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.save();
    });

    while (this.renderer.worldTex.update(px, pz, 16) > 0);
  }

  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.renderer.resize(
      Math.max(1, Math.round(r.width)),
      Math.max(1, Math.round(r.height)),
      Math.min(devicePixelRatio || 1, 2),
    );
  }

  start(): void {
    let last = performance.now();
    const tick = (now: number) => {
      requestAnimationFrame(tick);
      const ms = now - last;
      last = now;
      this.frame(Math.min(ms / 1000, 0.05), ms);
    };
    requestAnimationFrame(tick);
  }

  hold(seconds: number): void {
    if (this.reducedMotion) return;
    this.stop = Math.max(this.stop, Math.min(seconds, HOLD_MAX));
  }

  private frame(real: number, ms: number): void {
    const p = this.player;
    let dt = real;
    if (this.stop > 0) {
      this.stop -= real;
      dt = real * HOLD_RATE;
    }
    const held = Boolean(this.halt);
    if (held) dt = 0;
    this.time += dt;

    const cine = this.cinema;
    if (cine.blocking || held) this.controls.release();
    else this.controls.update(dt);

    const pace = held ? 0 : cine.pace;
    if (pace > 0) {
      for (const s of this.sim) s.update(dt * pace);
    }
    this.tutorial.update(dt);
    this.fx.update(pace > 0 ? dt * pace : dt);
    if (!held) cine.update(real);

    const w = this.world;
    this.entities.sweep();
    this.bus.emit('frame', real);

    this.biome = w.biome(p.x, p.z);
    updateEnv(this.env, this.hour, this.biome.rock);
    this.env.pave = this.biome.realm === 1 ? 0 : 1;
    this.env.realm = this.biome.realm || 0;
    this.env.wall = this.biome.walls || 0;
    this.env.sky = [((w.spec.seed >>> 0) % 997) / 997, this.biome.realm ? 0 : 1];
    this.env.skyTop = this.biome.ground2;
    this.env.cloud =
      this.biome.cloud + 0.16 * Math.sin(this.time / 83 + p.x * 0.002) * Math.cos(this.time / 131 + p.z * 0.0017);

    const low = !p.dead && p.hp < p.maxHp * (this.low ? LOW_HEALTH + 0.08 : LOW_HEALTH);
    if (low !== this.low) {
      this.low = low;
      if (low && !this.paused) this.bus.emit('lowhealth', {});
    }
    const floor = low ? 0.56 + (this.reducedMotion ? 0 : 0.14 * Math.sin(this.time * 3.2)) : 0;
    this.look.hurt = Math.max(floor, this.look.hurt - real * 2.2);
    this.look.fade = damp(this.look.fade, this.look.fadeGoal, 3, real);

    const at = cine.focus;
    this.renderer.worldTex.update(at ? at[0] : p.x, at ? at[1] : p.z, 2);
    this.portraits.update();
    this.camera.still = this.reducedMotion;
    this.camera.update(
      real,
      [p.x, p.y + 1.0, p.z],
      this.renderer.size.cssW / this.renderer.size.cssH,
      (x, z) => w.surface(x, z),
    );
    if (!this.warmed) this.warmed = this.renderer.warm();
    if (this.renderer.autoAdapt) this.renderer.adapt(ms);
    this.renderer.render(this.view.build(this.time));
    this.input.endFrame();

    this.saveTimer -= real;
    if (this.saveTimer <= 0) {
      this.saveTimer = 8;
      this.save();
    }
  }

  save(): void {
    const h = this.hero;
    if (!h || !this.started) return;
    const now = performance.now();
    h.played += Math.min(60, Math.max(0, (now - (this.playedAt || now)) / 1000));
    this.playedAt = now;
    h.sheet = this.player.sheet;
    h.saved = Date.now();
    h.view = [this.camera.goal.pitch, this.camera.goal.distance];
    const o = this.missions.pending || (this.missions.active && this.missions.active.offer);
    h.pending = o && !o.first ? { seed: o.seed, biome: o.biome } : null;
    this.store.saveHero(h, this.account);
  }

  load(h: SaveHero): void {
    const p = this.player;
    this.hero = h;
    p.sheet = h.sheet;
    claimUids(h.sheet);
    this.choosePeople(h.sheet.people || 'unit');
    derive(p);
    p.hp = p.maxHp;
    p.focus = p.maxFocus;
    this.missions.refresh();
    const o =
      h.pending && this.missions.offers.find((x) => x.seed === h.pending!.seed && x.biome === h.pending!.biome);
    this.missions.pending = o || null;
    this.savedView = h.view;
    this.bus.emit('class', { id: h.sheet.cls, cls: CLASSES[h.sheet.cls] });
    this.bus.emit('mission:taken', this.missions.pending);
  }

  enter(spec: ZoneSpec): void {
    const p = this.player;
    for (const e of this.entities.list) {
      if (e !== p) e.gone = true;
    }
    this.entities.sweep();
    this.monsters = [];
    this.loot.drops.length = 0;
    this.hazards.clear();
    this.fx.clear();
    this.world = new World(spec);
    this.renderer.setWorld(this.world);
    this.hour = this.world.biome().hour;
    this.biome = this.world.biome();
    Object.assign(p, {
      x: spec.start.x,
      z: spec.start.z,
      yaw: spec.start.yaw,
      target: null,
      pursue: false,
      moveTo: null,
      dash: null,
      action: 0,
      pending: null,
      mend: null,
      dead: false,
      grow: 1,
      invuln: 1.2,
      calm: 10,
    });
    p.y = this.world.surface(p.x, p.z);
    this.camera.target = [p.x, p.y + 1, p.z];
    this.camera.goal.yaw = Math.PI - spec.start.yaw;
    this.camera.yaw = Math.PI - spec.start.yaw;
    while (this.renderer.worldTex.update(p.x, p.z, 16) > 0);
    this.look.fade = 0;
    this.look.fadeGoal = 1;
    this.bus.emit('zone', { spec, biome: this.biome });
  }

  choosePeople(id: PeopleId): void {
    const p = this.player;
    const people = PEOPLES[id] || PEOPLES.human;
    const cls = CLASSES[p.sheet.cls];
    p.sheet.people = id;
    p.build = people.index;
    p.extra = people.index;
    p.scale = people.scale;
    p.height = 1.6 * people.scale;
    p.seed = people.look ?? 0.62;
    p.colors = pencils([cls.color, people.index === 0 ? cls.color : [236, 228, 210], people.hair[0]]);
    this.bus.emit('people', { id, people });
  }

  chooseClass(id: ClassId): void {
    const p = this.player;
    const cls = CLASSES[id];
    const people = p.sheet.people;
    p.sheet = newPlayerSheet(id);
    issue(p.sheet);
    this.choosePeople(people || 'unit');
    derive(p);
    p.hp = p.maxHp;
    p.focus = p.maxFocus;
    this.missions.refresh();
    this.bus.emit('class', { id, cls });
  }

  spendAttribute(attr: AttrKey): boolean {
    const s = this.player.sheet;
    if (s.points <= 0) return false;
    s.base[attr]++;
    s.points--;
    derive(this.player);
    this.bus.emit('ui:click');
    return true;
  }

  chooseTalent(id: TalentId): boolean {
    const s = this.player.sheet;
    if (!takeTalent(s, id)) return false;
    derive(this.player);
    this.bus.emit('talent', { id, name: TALENTS[id].name });
    this.bus.emit('ui:click');
    return true;
  }

  begin(): void {
    if (this.started) return;
    if (!this.hero) this.hero = this.store.newHero(this.player.sheet);
    this.playedAt = performance.now();
    this.started = true;
    this.paused = false;
    this.bus.emit('begin');
    this.save();
  }
}
