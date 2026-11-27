import { CLASSES } from '../data/classes';
import { LUMENS } from '../data/lumens';
import { PEOPLES } from '../data/peoples';
import { TOWN } from '../data/town';
import { makeEntity, pencils } from '../sim/entities';
import type { ArchetypeId, ClassId, LumenId, MissionBiomeId, PeopleId, RgbTuple } from '../types/domain';
import type { Entity } from '../types/entity';
import type { GameContext } from '../types/game-context';
import type { CameraRail, RenderEnv } from '../types/render';
import type { BiomeDef, WorldLike } from '../types/world';
import { hubSpec, missionSpec } from '../world/layout';
import { World } from '../world/world';
import { updateEnv } from './environment';

// The interface's pictures, drawn by the game itself the first time they are asked for: the peoples, the classes,
// the crew, the lumens and the places. They used to be files made by a tool that ran this same game in a headless
// browser; drawing them here keeps the game free of image files, and they can never drift from how the game looks.
//
// Figures are stood high in an overcast sky (clouds are bare paper) and seen from a little below, so each comes out as
// a drawing on a clean sheet. Places are another world (a contract's first island looking on to the next, or the town
// from the air), built for the picture and drawn on world textures of their own, so the game's own are left alone.

const RAD = Math.PI / 180;
/** pictures drawn in one frame, at most (a place is drawn alone: it builds a world) */
const BUDGET_MS = 10;
/** seeds for the places' pictures: any contract's islands would do, these ones look well */
const PLACE_SEEDS: Partial<Record<MissionBiomeId, number>> = {
  glasswood: 47,
  ember: 11,
  hush: 47,
  vault: 83,
  rime: 83,
  shatter: 47,
  amberwood: 83,
  bloomfall: 47,
  saltglass: 11,
};
const PLACE_SEED = 47;

interface FigureSpec {
  archetype: ArchetypeId;
  props: Partial<Entity> & Record<string, unknown>;
  w: number;
  h: number;
  tall: number;
  lens: number;
  turn: number;
  mid: number;
  up?: number;
  /** how far below the figure's feet its middle sits (the lumen floats) */
  drop?: number;
}

/** the peoples as the hero would wear them (the class colour is the Vanguard's), unarmed */
const WEAR: Record<PeopleId, [RgbTuple, RgbTuple]> = {
  unit: [
    [214, 70, 52],
    [214, 70, 52],
  ],
  human: [
    [84, 108, 156],
    [226, 176, 52],
  ],
  veiled: [
    [126, 92, 150],
    [84, 66, 120],
  ],
  karn: [
    [176, 118, 62],
    [232, 164, 48],
  ],
  lynd: [
    [70, 150, 150],
    [224, 112, 128],
  ],
};

/** the classes: a scout unit in each class's colour, weapon in hand, mid-move: [action, its moment, kit] */
const ACTS: Record<ClassId, [number, number, number]> = {
  vanguard: [1, 0.36, 0.4],
  ranger: [2, 0.5, 1],
  adept: [2, 0.5, 2],
};

function figureSpec(name: string): FigureSpec | null {
  const [kind, id] = [name.slice(0, name.indexOf('-')), name.slice(name.indexOf('-') + 1)];
  if (kind === 'people') {
    const P = PEOPLES[id as PeopleId];
    const wear = WEAR[id as PeopleId];
    if (!P || !wear) return null;
    return {
      archetype: 'humanoid',
      props: { extra: P.index, scale: P.scale, kit: 3, seed: 0.62, colors: pencils([wear[0], wear[1], P.hair[0]]) },
      w: 360,
      h: 440,
      tall: 1.95 * P.scale,
      lens: 13,
      turn: 0.55,
      mid: 0.47,
    };
  }
  if (kind === 'class') {
    const c = CLASSES[id as ClassId];
    if (!c) return null;
    const [action, at, kit] = ACTS[id as ClassId];
    return {
      archetype: 'humanoid',
      props: { extra: 0, kit, action, actionT: at, actionDur: 1e3, seed: 0.5, colors: pencils([c.color, c.color, [122, 62, 44]]) },
      w: 360,
      h: 300,
      tall: 1.95,
      lens: 16,
      turn: id === 'vanguard' ? 0.6 : 0.8,
      mid: 0.47,
    };
  }
  if (kind === 'crew') {
    const n = TOWN.crew.find((c) => c.name.toLowerCase() === id);
    if (!n) return null;
    const P = PEOPLES[n.people] || PEOPLES.unit;
    return {
      archetype: 'humanoid',
      props: {
        extra: P.index,
        scale: P.scale,
        kit: 3,
        seed: n.seed ?? 0.4,
        colors: pencils([n.color, n.trim || n.color, n.hair || P.hair[0]]),
      },
      w: 240,
      h: 240,
      tall: 1.02 * P.scale,
      lens: 8,
      turn: 0.4,
      mid: P.index === 3 ? 1.2 : P.index === 4 ? 1.24 : 1.14,
      up: 9,
    };
  }
  if (kind === 'lumen') {
    const L = LUMENS[id as LumenId];
    if (!L) return null;
    return {
      archetype: 'lumen',
      props: { extra: L.shape, move: 0.65, seed: 0.3, colors: pencils(L.colors) },
      w: 200,
      h: 200,
      tall: 1.0,
      lens: 9,
      turn: 0.45,
      mid: 0.5,
      up: 14,
      drop: 0.5,
    };
  }
  return null;
}

/** A camera a little below a figure, looking up at it: tall is the height to fit, turn the angle off its front. */
function below(x: number, y: number, z: number, tall: number, lens: number, turn: number, mid: number, up: number): CameraRail {
  const D = (tall / 2 / Math.tan((lens * RAD) / 2)) * 1.04;
  const a = up * RAD;
  const cy = y + tall * mid;
  const t = turn + Math.PI; // (the figures face north; the camera stands north of them and looks south, away from the ringed planet)
  return {
    pos: [x + Math.sin(t) * Math.cos(a) * D, cy - Math.sin(a) * D, z + Math.cos(t) * Math.cos(a) * D],
    look: [x, cy, z],
    lens: lens * RAD,
    mix: 1,
  };
}

interface PlaceShot {
  world: WorldLike;
  biome: BiomeDef;
  hour: number;
  at: [number, number];
}

function copyEnv(env: RenderEnv): RenderEnv {
  const out = { ...env } as Record<string, unknown>;
  for (const k in out) if (Array.isArray(out[k])) out[k] = (out[k] as unknown[]).slice();
  return out as unknown as RenderEnv;
}

export class ArtStudio {
  private readonly game: GameContext;
  private readonly urls = new Map<string, string>();
  private readonly asked = new Set<string>();
  private readonly queue: string[] = [];
  private town: World | null = null;
  private readonly webp: boolean;
  /** places drawn ahead while the select screen is up (each builds a world, so one every few frames) */
  private readonly ahead: string[] = ['place-town', ...Object.keys(PLACE_SEEDS).map((id) => 'place-' + id)];
  private wait = 30;

  constructor(game: GameContext) {
    this.game = game;
    const probe = document.createElement('canvas');
    probe.width = probe.height = 1;
    this.webp = probe.toDataURL('image/webp').startsWith('data:image/webp');
    // the select screen's pictures first, then the rest of the figures (the places wait to be asked for: each builds a world)
    for (const id of Object.keys(PEOPLES)) this.picture('people-' + id);
    for (const id of Object.keys(CLASSES)) this.picture('class-' + id);
    game.bus.on('begin', () => {
      for (const n of TOWN.crew) this.picture('crew-' + n.name.toLowerCase());
      for (const id of Object.keys(LUMENS)) this.picture('lumen-' + id);
    });
  }

  picture(name: string): string | undefined {
    const url = this.urls.get(name);
    if (url) return url;
    if (!this.asked.has(name)) {
      this.asked.add(name);
      // a picture the interface is showing now goes ahead of the ones drawn in advance
      this.queue.unshift(name);
    }
    return undefined;
  }

  /** Draws what is waiting, within a small budget a frame. True if anything new is ready. */
  update(): boolean {
    if (!this.queue.length && this.ahead.length && !this.game.started && --this.wait <= 0) {
      this.wait = 12;
      this.picture(this.ahead.shift()!);
    }
    if (!this.queue.length) return false;
    const t0 = performance.now();
    let drew = false;
    while (this.queue.length) {
      const name = this.queue[0];
      const place = name.startsWith('place-');
      if (place && drew) break;
      this.queue.shift();
      try {
        const url = place ? this.place(name.slice(6)) : this.figure(name);
        if (url) {
          this.urls.set(name, url);
          drew = true;
        }
      } catch (err) {
        console.warn('Picture not drawn:', name, err);
      }
      if (place || performance.now() - t0 > BUDGET_MS) break;
    }
    return drew;
  }

  private figure(name: string): string | null {
    const spec = figureSpec(name);
    if (!spec) return null;
    const g = this.game;
    const p = g.player;
    const x = p.x;
    const y = p.y + 70;
    const z = p.z;
    const e = g.entities.add(
      makeEntity('set', spec.archetype, { x, y, z, far: true, ...spec.props, yaw: Math.PI }),
    );
    try {
      const rail = below(x, y - (spec.drop || 0), z, spec.tall, spec.lens, spec.turn, spec.mid, spec.up ?? 15.5);
      return this.shoot(spec.w, spec.h, rail, e, null);
    } finally {
      e.gone = true;
      g.entities.sweep();
    }
  }

  private place(id: string, seed?: number): string | null {
    let world: World;
    let rail: CameraRail;
    let at: [number, number];
    if (id === 'town') {
      world = this.town || (this.town = new World(hubSpec(TOWN)));
      const y0 = world.surface(0, 0);
      const D = 64;
      const yaw = 0.62;
      rail = { pos: [Math.sin(yaw) * D, y0 + 9, 4 + Math.cos(yaw) * D], look: [-6, y0 + 9, 0], lens: 36 * RAD, mix: 1 };
      at = [0, 0];
    } else {
      world = new World(
        missionSpec({
          seed: seed ?? PLACE_SEEDS[id as MissionBiomeId] ?? PLACE_SEED,
          biome: id as MissionBiomeId,
          goal: 'sweep',
          tier: 1,
          rooms: 4,
          name: '',
          xp: 0,
          glint: 0,
        }),
      );
      const [a, b] = world.rooms;
      if (!a || !b) return null;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const l = Math.hypot(dx, dz) || 1;
      const ux = dx / l;
      const uz = dz / l;
      const ya = world.surface(a.x, a.z);
      const yb = world.surface(b.x, b.z);
      rail = {
        pos: [a.x - ux * 13 + uz * 5, ya + 6.5, a.z - uz * 13 - ux * 5],
        look: [b.x, yb + 2.2, b.z],
        lens: 44 * RAD,
        mix: 1,
      };
      at = [a.x + ux * 20, a.z + uz * 20];
    }
    const biome = world.biome(at[0], at[1]);
    return this.shoot(640, 300, rail, null, { world, biome, hour: world.biome().hour, at });
  }

  /** One picture through the game's own renderer, everything it touches put back as it was. */
  private shoot(w: number, h: number, rail: CameraRail, subject: Entity | null, place: PlaceShot | null): string {
    const g = this.game;
    const r = g.renderer;
    const cam = g.camera;
    const view = g.view;
    const p = g.player;
    const was = {
      size: { ...r.size },
      scale: r.scale,
      paper: { ...r.paper },
      map: [...r.minimap.rect] as [number, number, number, number],
      rail: cam.rail,
      shake: cam.shake,
      target: [...cam.target] as [number, number, number],
      env: copyEnv(g.env),
      fade: g.look.fade,
      veil: g.look.veil,
      hurt: g.look.hurt,
      only: view.only,
      world: g.world,
      biome: g.biome,
      hour: g.hour,
      monsters: g.monsters,
      p: { x: p.x, y: p.y, z: p.z, grow: p.grow },
    };
    try {
      view.only = subject || p;
      g.look.fade = 1;
      g.look.veil = 0;
      g.look.hurt = 0;
      cam.shake = 0;
      r.scale = 1.4;
      r.resize(w, h, Math.min(2, Math.max(1, window.devicePixelRatio || 1)));
      r.paper.a = null;
      r.paper.b = null;
      r.paper.mix = 0;
      r.minimap.rect = [0, 0, 0, 0];
      cam.rail = rail;
      const draw = (): string => {
        cam.update(0, rail.look, w / h, null);
        r.render(view.build(g.time));
        return g.canvas.toDataURL(this.webp ? 'image/webp' : 'image/png', 0.88);
      };
      if (!place) {
        g.env.cloud = 1.7;
        return draw();
      }
      const b = place.biome;
      const world = place.world;
      g.world = world;
      g.biome = b;
      g.hour = place.hour;
      g.monsters = [];
      p.grow = 0;
      p.x = place.at[0];
      p.z = place.at[1];
      p.y = world.surface(p.x, p.z);
      updateEnv(g.env, place.hour, b.rock);
      g.env.pave = b.realm === 1 ? 0 : 1;
      g.env.realm = b.realm || 0;
      g.env.wall = b.walls || 0;
      g.env.sky = [((world.spec.seed >>> 0) % 997) / 997, b.realm ? 0 : 1];
      g.env.skyTop = b.ground2;
      g.env.cloud = b.cloud;
      return r.withWorld(world, (tex) => {
        while (tex.update(p.x, p.z, 16) > 0);
        return draw();
      });
    } finally {
      view.only = was.only;
      cam.rail = was.rail;
      cam.shake = was.shake;
      cam.target = was.target;
      Object.assign(g.env, was.env);
      g.look.fade = was.fade;
      g.look.veil = was.veil;
      g.look.hurt = was.hurt;
      g.world = was.world;
      g.biome = was.biome;
      g.hour = was.hour;
      g.monsters = was.monsters;
      Object.assign(p, was.p);
      r.scale = was.scale;
      Object.assign(r.paper, was.paper);
      r.minimap.rect = was.map;
      r.resize(was.size.cssW, was.size.cssH, was.size.dpr);
    }
  }
}
